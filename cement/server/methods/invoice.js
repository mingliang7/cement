import {Item} from '../../imports/api/collections/item';
import {ReceivePayment} from '../../imports/api/collections/receivePayment';
import {Penalty} from '../../imports/api/collections/penalty';
import {RemovedInvoice} from '../../imports/api/collections/removedCollection';
import {Invoices} from '../../imports/api/collections/invoice';
import {Order} from '../../imports/api/collections/order';
Meteor.methods({
    getInvoice({_id}){
        return Invoices.findOne(_id);
    },
    insertRemovedInvoice(doc){
        if (doc.invoiceType == 'term' && (doc.status == 'partial' || doc.status == 'closed')) {
            ReceivePayment.remove({invoiceId: doc._id});
        }
        doc.status = 'removed';
        doc.removeDate = new Date();
        doc._id = `${doc._id}R${moment().format('YYYY-MMM-DD-HH:mm')}`;
        RemovedInvoice.insert(doc);
    },
    calculateLateInvoice({invoices}){
        let count = 0;
        let penalty = Penalty.findOne({}, {sort: {_id: -1}}) || {rate: 0, notExist: true};
        let lateInvoices = [];
        let currentDate = moment();
        let calculatePenalty = {};
        invoices.forEach(function (invoice) {
            let invoiceDate = moment(invoice.dueDate);
            let numberOfDayLate = currentDate.diff(invoiceDate, 'days');
            if (numberOfDayLate > 0) {
                count += 1;
                if (invoice.status == 'partial') {
                    let lastReceivePayment = ReceivePayment.findOne({invoiceId: invoice._id}, {sort: {_id: -1}});
                    calculatePenalty[invoice._id] = (lastReceivePayment.balanceAmount * (penalty.rate / 100) * numberOfDayLate);
                } else {
                    calculatePenalty[invoice._id] = (invoice.total * (penalty.rate / 100) * numberOfDayLate);
                }
                lateInvoices.push(invoice._id);
            }
        });
        return {count, lateInvoices, calculatePenalty, penaltyNotExist: penalty.notExist || false};
    },
    invoiceShowItems({doc}){
        if (doc.invoiceType == 'saleOrder') {
            doc.saleOrder = Order.findOne({_id: doc.saleId});
        }
        doc.items.forEach(function (item) {
            item.name = Item.findOne(item.itemId).name;
        });
        return doc;
    },
    noRefBillIdInvoice({selector}){
        return Invoices.find(selector).fetch();
    },
    groupInvoiceItemByPrice({selector}){
        let invoices = Invoices.aggregate([
            {$match: selector},
            {
                $unwind: {path: '$items', preserveNullAndEmptyArrays: true}
            },
            {
                $group: {
                    _id: {itemId: '$items.itemId', price: '$items.price'},
                    qty: {$sum: '$items.qty'},
                    price: {$last: '$items.price'},
                    itemId: {$last: '$items.itemId'}
                }
            },
            {
                $lookup: {
                    from: 'cement_item',
                    localField: 'itemId',
                    foreignField: '_id',
                    as: 'itemDoc'
                }
            },
            {$unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}},
            {
                $project: {
                    _id: 0,
                    qty: 1,
                    price: 1,
                    itemId: 1,
                    name: {$ifNull: ['$itemDoc.name', '']},
                    amount: {$multiply: ["$qty", "$price"]}
                }
            },

            {$sort: {name: 1, price: 1}},
            {
                $group: {
                    _id: null,
                    items: {
                        $push: '$$ROOT'
                    },
                    total: {$sum: '$amount'}
                }
            }

        ]);
        if (invoices[0] && invoices[0].items && invoices[0].items.length > 0) {
            return {items: invoices[0].items, total: invoices[0].total};
        }
        return {items: [], total: 0};
    },
    checkLastDateOfReceiveOrder({saleId,selfId}){
        let selector = {
            saleId
        };
        if(selfId) {
            selector._id = {$nin: [selfId]};
        }
        return  Invoices.findOne(selector, {sort: {invoiceDate: -1}})
    }
});