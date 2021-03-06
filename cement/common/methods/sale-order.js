import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {CallPromiseMixin} from 'meteor/didericis:callpromise-mixin';

// Collection
import {Order} from '../../imports/api/collections/order.js';
import {Invoices} from '../../imports/api/collections/invoice';
import {SaleOrderReceivePayment} from '../../imports/api/collections/saleOrderReceivePayment';
// Check user password
export const saleOrderInfo = new ValidatedMethod({
    name: 'cement.saleOrderInfo',
    mixins: [CallPromiseMixin],
    validate: new SimpleSchema({
        _id: {
            type: String
        }
    }).validator(),
    run({
        _id
    }) {
        if (!this.isSimulation) {
            let order = Order.aggregate([{
                $unwind: '$items'
            }, {
                $lookup: {
                    from: "cement_item",
                    localField: "items.itemId",
                    foreignField: "_id",
                    as: "fItems"
                }
            }, {
                $unwind: '$fItems'
            }, {
                $group: {
                    _id: '$_id',
                    data: {
                        $addToSet: {
                            _id: '$_id',
                            orderDate: '$orderDate',
                            des: '$des',
                            customer: '$_customer.name',
                            total: '$total'
                        }
                    },
                    items: {
                        $addToSet: {
                            itemId: '$items.itemId',
                            name: '$fItems.name',
                            qty: '$items.qty',
                            price: '$items.price',
                            amount: '$items.amount',
                        }
                    }
                }
            }, {
                $unwind: '$data'
            }]);

            return order[0];
        }
    }
});

export const removeItemInSaleOrder = new ValidatedMethod({
    name: 'cement.removeItemInSaleOrder',
    mixins: [CallPromiseMixin],
    validate: new SimpleSchema({
        item: {type: Object}
    }).validator(),
    run({item}){
        if (!this.isSimulation) {
            Order.update({_id: item.saleId, 'items.itemId': item.itemId},
                {
                    $pull: {'items.$.itemId': item.itemId},
                    $inc: {sumRemainQty: item.qty}
                })
        }
    }
});


export const updateItemInSaleOrder = new ValidatedMethod({
    name: 'cement.updateItemInSaleOrder',
    mixins: [CallPromiseMixin],
    validate: new SimpleSchema({
        doc: {
            type: Object
        }
    }).validator(),
    run({doc}){
        if (!this.isSimulation) {
            Meteor._sleepForMs(200);
            doc.items.forEach(function (item) {
                Order.direct.update(
                    {_id: doc.saleId, 'item.itemId': item._id},
                    {$inc: {'item.$.remainQty': -item.qty, sumRemainQty: -item.qty}}
                )
            });
        }
    }
});

export const isInvoiceExist = new ValidatedMethod({
    name: 'cement.isInvoiceExist',
    mixins: [CallPromiseMixin],
    validate: new SimpleSchema({
        _id: {type: String}
    }).validator(),
    run({_id}){
        if (!this.isSimulation) {
            let invoice = Invoices.findOne({saleId: _id});
            let saleOrderReceivePayment = SaleOrderReceivePayment.findOne({invoiceId: _id});
            let invoiceId;
            if(invoice){
                invoiceId = invoice._id;
            }else{
                invoiceId = saleOrderReceivePayment._id;
            }
            return {
                collection: invoice ? 'Invoice' : 'SO payment',
                exist: invoice ? invoice : saleOrderReceivePayment,
                invoiceId: invoiceId
            };
        }
    }
});