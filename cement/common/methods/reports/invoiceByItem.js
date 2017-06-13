import {Meteor} from 'meteor/meteor';
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {CallPromiseMixin} from 'meteor/didericis:callpromise-mixin';
import {_} from 'meteor/erasaur:meteor-lodash';
import {moment} from  'meteor/momentjs:moment';

// Collection
import {Company} from '../../../../core/imports/api/collections/company.js';
import {Invoices} from '../../../imports/api/collections/invoice';
import {Exchange} from '../../../../core/imports/api/collections/exchange';
// lib func
import {correctFieldLabel} from '../../../imports/api/libs/correctFieldLabel';
import {exchangeCoefficient} from '../../../imports/api/libs/exchangeCoefficient';
import ReportFn from "../../../imports/api/libs/report";
export const invoiceByItemReport = new ValidatedMethod({
    name: 'cement.invoiceByItemReport',
    mixins: [CallPromiseMixin],
    validate: null,
    run(params) {
        if (!this.isSimulation) {
            Meteor._sleepForMs(200);
            let selector = {};
            let project = {};
            let data = {
                title: {},
                fields: [],
                displayFields: [],
                content: [{index: 'No Result'}],
                footer: {}
            };
            let branchId = [];
            if (params.branchId) {
                branchId = params.branchId.split(',');
                selector.branchId = {
                    $in: branchId
                };
                selector = ReportFn.checkIfUserHasRights({currentUser: Meteor.userId(), selector});
            }
            let itemSelector = {$nin: []};
            let exchange = Exchange.findOne({}, {sort: {_id: -1}});
            let coefficient = exchangeCoefficient({exchange, fieldToCalculate: {$sum: ["$items.amount"]}})

            // console.log(user);
            // let date = _.trim(_.words(params.date, /[^To]+/g));
            selector.invoiceType = {$ne: 'saleOrder'};
            if (params.so) {
                selector.invoiceType = {$eq: 'saleOrder'}
            }
            selector.status = {$in: ['active', 'partial', 'closed']};
            if (params.date) {
                let dateAsArray = params.date.split(',')
                let fromDate = moment(dateAsArray[0]).toDate();
                let toDate = moment(dateAsArray[1]).toDate();
                data.title.date = moment(fromDate).format('YYYY-MMM-DD hh:mm a') + ' - ' + moment(toDate).format('YYYY-MMM-DD hh:mm a');
                data.title.exchange = `USD = ${coefficient.usd.$multiply[1]} $, KHR = ${coefficient.khr.$multiply[1]}<small> ៛</small>, THB = ${coefficient.thb.$multiply[1]} B`;
                selector.invoiceDate = {$gte: fromDate, $lte: toDate};
            }
            if (params.customer && params.customer != '') {
                selector.customerId = params.customer;
            }
            if (params.items) {
                itemSelector = {$in: params.items.split(',')};
            }
            data.fields = [
                {field: '<th>Date</th>'},
                {field: '<th>INVN</th>'},
                {field: '<th>Name</th>'},
                {field: '<th>Addr</th>'},
                {field: '<th>Tel</th>'},
                {field: '<th>Item</th>'},
                {field: '<th class="text-center">Qty</th>'},
                {field: '<th class="text-center">Price</th>'},
                {field: '<th class="text-center">TSFee</th>'},
                {field: '<th class="text-center">SubAmount</th>'},
                {field: '<th class="text-center">TSAMount</th>'},
                {field: '<th class="text-center">Amount</th>'}];
            data.displayFields = [
                {field: 'date'},
                {field: 'invoiceId'},
                {field: 'customer'},
                {field: 'address'},
                {field: 'tel'},
                {field: 'itemName'},
                {field: 'qty'},
                {field: 'price'},
                {field: 'tsFee'},
                {field: 'subAmount'},
                {field: 'tsFeeAmount'},
                {field: 'amount'}];

            // project['$invoice'] = 'Invoice';
            /****** Title *****/
            data.title.company = Company.findOne();
            /****** Content *****/
            let invoices = Invoices.aggregate([
                {
                    $match: selector
                },
                {$unwind: {path: '$items', preserveNullAndEmptyArrays: true}},
                {
                    $match: {
                        'items.itemId': itemSelector
                    }
                },
                {
                    $lookup: {
                        from: "cement_item",
                        localField: "items.itemId",
                        foreignField: "_id",
                        as: "itemDoc"
                    }
                },
                {
                    $group: {
                        _id: {
                            customerId: '$customerId',
                            itemId: '$items.itemId',
                            invoiceId: '$_id',
                        },
                        invoiceId: {$last: '$_id'},
                        date: {$last: '$invoiceDate'},
                        customerId: {$last: '$customerId'},
                        itemName: {$last: '$itemDoc.name'},
                        qty: {$sum: '$items.qty'},
                        price: {$sum: '$items.price'},
                        tsFee: {$sum: '$items.transportFee'},
                        tsFeeAmount: {$sum: {$multiply: ["$items.qty", "$items.transportFee"]}},
                        subAmount: {$sum: {$multiply: ["$items.qty", "$items.price"]}},
                        amount: {$sum: '$items.amount'},
                        total: {$last: '$total'},

                    }
                },
                {
                    $lookup: {
                        from: "cement_customers",
                        localField: "customerId",
                        foreignField: "_id",
                        as: "customerDoc"
                    }
                }, {
                    $unwind: {path: '$customerDoc', preserveNullAndEmptyArrays: true}
                },
                {$sort: {'customerDoc.name': 1}},
                {
                    $group: {
                        _id: '$customerId',
                        items: {
                            $addToSet: {
                                invoiceId: '$invoiceId',
                                date: '$date',
                                customer: '$customerDoc.name',
                                tel: '$customerDoc.telephone',
                                address: '$customerDoc.address',
                                itemName: '$itemName',
                                qty: '$qty',
                                price: '$price',
                                tsFee: '$tsFee',
                                tsFeeAmount: '$tsFeeAmount',
                                subAmount: '$subAmount',
                                amount: '$amount'
                            }
                        },
                        tsFeeAmount: {$sum: '$tsFeeAmount'},
                        subAmount: {$sum: '$subAmount'},
                        totalQty: {$sum: '$qty'},
                    }
                },
                {
                    $group: {
                        _id: null,
                        data: {
                            $addToSet: '$$ROOT'
                        },
                        totalQty: {$sum: '$totalQty'},
                        totalTsFeeAmount: {$sum: '$tsFeeAmount'},
                        totalSubAmount: {$sum: '$subAmount'},
                        total: {$sum: {$add: ['$tsFeeAmount', '$subAmount']}},
                    }
                }

            ]);
            let invoiceItemSummary = Invoices.aggregate([
                {
                    $match: selector
                },
                {
                    $unwind: {path: '$items', preserveNullAndEmptyArrays: true}
                },
                {
                    $match: {'items.itemId': itemSelector}
                },
                {
                    $lookup: {
                        from: "cement_item",
                        localField: "items.itemId",
                        foreignField: "_id",
                        as: "itemDoc"
                    }
                },
                {$unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}},
                {
                    $group: {
                        _id: '$items.itemId',
                        itemName: {
                            $addToSet: '$itemDoc.name'
                        },
                        qty: {$sum: '$items.qty'},
                        subAmount: {
                            $sum: {
                                $multiply: [
                                    '$items.price',
                                    '$items.qty']
                            }
                        },
                        tsFeeAmount: {
                            $sum: {
                                $multiply: [
                                    '$items.transportFee',
                                    '$items.qty']
                            }
                        },
                        amount: {$sum: '$items.amount'}
                    }
                },
                {
                    $project: {
                        _id: 1,
                        itemName: 1,
                        qty: 1,
                        subAmount: 1,
                        tsFeeAmount: 1,
                        amount: 1,
                        tsFee: {$divide: ["$tsFeeAmount", "$qty"]},
                        price: {$divide: ["$subAmount", "$qty"]}
                    }
                },
                {$unwind: {path: '$itemName', preserveNullAndEmptyArrays: true}},
                {$sort: {itemName: 1}}
            ]);
            if (invoices.length > 0) {
                data.content = invoices[0].data;
                data.footer = {
                    itemsSummary: invoiceItemSummary,
                    totalTsFeeAmount: invoices[0].totalTsFeeAmount,
                    totalSubAmount: invoices[0].totalSubAmount,
                    totalQty: invoices[0].totalQty,
                    total: invoices[0].total,
                    totalKhr: invoices[0].totalKhr,
                    totalThb: invoices[0].totalThb
                }
            }
            return data
        }
    }
});
