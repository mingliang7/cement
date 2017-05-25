import {Meteor} from 'meteor/meteor';
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {CallPromiseMixin} from 'meteor/didericis:callpromise-mixin';
import {_} from 'meteor/erasaur:meteor-lodash';
import {moment} from  'meteor/momentjs:moment';

// Collection
import {Company} from '../../../../core/imports/api/collections/company.js';
import {AverageInventories} from '../../../imports/api/collections/inventory';
import {Invoices} from '../../../imports/api/collections/invoice';
// lib func
import {correctFieldLabel} from '../../../imports/api/libs/correctFieldLabel';
export const stockBalanceReport = new ValidatedMethod({
    name: 'cement.stockBalanceReport',
    mixins: [CallPromiseMixin],
    validate: null,
    run(params) {
        if (!this.isSimulation) {
            Meteor._sleepForMs(200);
            let selector = {};
            let invoiceSelector = {invoiceType: {$ne: 'saleOrder'}};
            let project = {};
            let data = {
                title: {},
                fields: [],
                displayFields: [],
                content: [{index: 'No Result'}],
                footer: {},
                footerInvoice: {}
            };

            // let date = _.trim(_.words(params.date, /[^To]+/g));
            if (params.date) {
                let asOfDate = moment(params.date).endOf('days').toDate();
                data.title.date = moment(asOfDate).format('YYYY-MMM-DD');
                selector.inventoryDate = {$lte: asOfDate};
                invoiceSelector.$or = [
                    {refBillId: {$exists: false}, invoiceDate: {$lte: asOfDate}},
                    {refBillId: {$exists: true}, invoiceDate: {$lte: asOfDate}, refBillDate: {$gt: asOfDate}},
                ]
            }
            if (params.branch) {
                selector.branchId = {$in: params.branch.split(',')};
                invoiceSelector.branchId= {$in: params.branch.split(',')};
            }
            if (params.items) {
                selector.itemId = {
                    $in: params.items.split(',')
                }
            }
            if (params.location) {
                selector.stockLocationId = {
                    $in: params.location.split(',')
                }
            }
            //check if user has right to view multi branches
            let user = Meteor.users.findOne({_id: Meteor.userId()});
            for (let i = 0; i < selector.branchId.$in.length; i++) {
                if (!_.includes(user.rolesBranch, selector.branchId.$in[i])) {
                    _.pull(selector.branchId.$in, selector.branchId.$in[i]);
                }
            }
            if (params.filter && params.filter != '') {
                let filters = params.filter.split(','); //map specific field
                for (let i = 0; i < filters.length; i++) {
                    data.fields.push({field: correctDotObject(filters[i], true)});
                    data.displayFields.push({field: correctDotObject(filters[i], false)});
                    project[correctDotObject(filters[i], false)] = `$${filters[i]}`;

                }
                data.fields.push({field: 'Remain QTY'}); //map total field for default
                data.displayFields.push({field: 'remainQty'});
                data.fields.push({field: 'Amount'}); //map total field for default
                data.displayFields.push({field: 'amount'});
                project['remainQty'] = '$lastDoc.remainQty'; //get total projection for default
                project['amount'] = '$lastDoc.amount'; //get total projection for default
            } else {
                project = {
                    'item': '$lastDoc.itemDoc.name',
                    'itemId': '$lastDoc.itemId',
                    'price': '$lastDoc.price',
                    'unit': '$lastDoc.itemDoc._unit.name',
                    'remainQty': '$lastDoc.remainQty',
                    'amount': '$lastDoc.amount',
                    'averagePrice': '$lastDoc.averagePrice',
                    'lastAmount': '$lastDoc.lastAmount'

                };
                data.fields = [{field: 'Item'}, {field: 'Unit'}, {field: 'Price'}, {field: 'Remain QTY'}, {field: 'Amount'}];
                data.displayFields = [{field: 'item'}, {field: 'unit'}, {field: 'price'}, {field: 'remainQty'}, {field: 'lastAmount'}];
            }

            /****** Title *****/
            data.title.company = Company.findOne();

            /****** Content *****/
            let inventories = AverageInventories.aggregate([

                {$match: selector},
                {$sort: {_id: 1, createdAt: 1}},
                {
                    $lookup: {
                        from: "cement_item",
                        localField: "itemId",
                        foreignField: "_id",
                        as: "itemDoc"
                    }
                },
                {$unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}},
                {
                    $lookup: {
                        from: 'Cement_categories',
                        localField: 'itemDoc.categoryId',
                        foreignField: '_id',
                        as: 'itemDoc.categoryDoc'
                    }
                },
                {$unwind: {path: '$itemDoc.categoryDoc', preserveNullAndEmptyArrays: true}},
                {
                    $lookup: {
                        from: "cement_stockLocations",
                        localField: "stockLocationId",
                        foreignField: "_id",
                        as: "locationDoc"
                    }
                },
                {$unwind: {path: '$locationDoc', preserveNullAndEmptyArrays: true}},
                {
                    $lookup: {
                        from: "core_branch",
                        localField: "branchId",
                        foreignField: "_id",
                        as: "branchDoc"
                    }
                },
                {$unwind: {path: '$branchDoc', preserveNullAndEmptyArrays: true}},
                {
                    $project: {
                        itemId: 1,
                        createdAt: 1,
                        itemDoc: 1,
                        branchDoc: 1,
                        locationDoc: 1,
                        stockLocationId: 1,
                        branchId: 1,
                        qty: 1,
                        price: 1,
                        averagePrice: 1,
                        remainQty: 1,
                        amount: 1,
                        lastAmount: 1
                    }
                },
                {
                    $group: {
                        _id: {branch: '$branchId', itemId: '$itemId', stockLocationId: '$stockLocationId'},
                        lastDoc: {$last: '$$ROOT'}
                    }
                },
                {
                    $group: {
                        _id: null,
                        data: {
                            $addToSet: project
                        },
                        total: {
                            $sum: '$lastDoc.lastAmount'
                        },
                        totalRemainQty: {
                            $sum: '$lastDoc.remainQty'
                        }
                    }
                }

            ]);
            let invoices = Invoices.aggregate([
                {
                    $facet: {
                        totalInvoice: [
                            {
                                $match: invoiceSelector
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: {$sum: '$total'},
                                    totalTransportFee: {$sum: '$totalTransportFee'}
                                }

                            }, {
                                $project: {
                                    _id: 0,
                                    totalAmount: {$subtract: ["$totalAmount", "$totalTransportFee"]}
                                }
                            }
                        ],
                        invoiceData: [
                            {
                                $match: invoiceSelector
                            },
                            {
                                $unwind: {path: '$items', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $group: {
                                    _id: '$items.itemId',
                                    qty: {$sum: '$items.qty'},
                                    amount: {$sum: '$items.amount'},
                                    tsFee: {$sum: '$items.transportFee'},
                                    amountCost: {$sum: {$subtract: ["$items.amount", {$multiply: ["$items.transportFee", "$items.qty"]}]}}
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    qty:1 ,
                                    amount: 1,
                                    tsFee: 1,
                                    price: {$divide: ["$amountCost", "$qty"]},
                                    amountCost: 1
                                }
                            },
                            {
                                $lookup: {
                                    from: 'cement_item',
                                    foreignField: '_id',
                                    localField: '_id',
                                    as: 'itemDoc'
                                }
                            },
                            {
                                $unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $group: {
                                    _id: null,
                                    data: {
                                        $push: '$$ROOT'
                                    },
                                    totalCost: {$sum: '$amountCost'}
                                }
                            }

                        ]
                    }
                },
            ]);
            if (inventories.length > 0) {
                let sortData = _.sortBy(inventories[0].data, 'item');
                data.footer.total = inventories[0].total;
                data.footer.totalRemainQty = inventories[0].totalRemainQty;
                inventories[0].data = sortData;
                data.content = inventories;
                data.contentInvoice = invoices[0].invoiceData[0] ? invoices[0].invoiceData[0].data : [];
                data.footerInvoice.totalQty = invoices[0].totalInvoice[0] ? invoices[0].totalInvoice[0].totalQty : 0;
                data.footerInvoice.totalAmount = invoices[0].totalInvoice[0] ? invoices[0].totalInvoice[0].totalAmount : 0;
                data.footer.remainAmount = math.round(inventories[0].total,2) - math.round((invoices[0].invoiceData[0] ? invoices[0].invoiceData[0].totalCost : 0),2)
            } else {
                data.contentInvoice = invoices[0].invoiceData[0] ? invoices[0].invoiceData[0].data : [];
                // data.contentInvoice = invoices[0] ? invoices[0].data : [];
                // data.footerInvoice.totalQty = invoices[0] ? invoices[0].totalQty : 0;
                data.footerInvoice.totalAmount = invoices[0].totalInvoice[0] ? invoices[0].totalInvoice[0].totalAmount : 0;
                data.footer.remainAmount = 0 - (invoices[0].totalInvoice[0] ? invoices[0].totalInvoice[0].totalAmount : 0)
            }
            return data
        }
    }
});


function correctDotObject(prop, forLabel) {
    let projectField = '';
    switch (prop) {
        case 'lastDoc.itemDoc.name':
            projectField = 'item';
            break;
        case 'lastDoc.price':
            projectField = 'price';
            break;
        case 'lastDoc.branchDoc.enShortName':
            projectField = 'branch';
            break;
        case 'lastDoc.locationDoc.name':
            projectField = 'location';
            break;
        case 'lastDoc.itemDoc._unit.name':
            projectField = 'unit';
            break;
    }

    return forLabel ? _.capitalize(projectField) : projectField;
}