import {Meteor} from 'meteor/meteor';
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {CallPromiseMixin} from 'meteor/didericis:callpromise-mixin';
import {_} from 'meteor/erasaur:meteor-lodash';
import {moment} from  'meteor/momentjs:moment';

// Collection
import {AverageInventories} from '../../../imports/api/collections/inventory';
import {Branch} from '../../../../core/imports/api/collections/branch';
// lib func
import {correctFieldLabel} from '../../../imports/api/libs/correctFieldLabel';
import ReportFn from "../../../imports/api/libs/report";
export const stockDetailReportMethod = new ValidatedMethod({
    name: 'cement.stockDetailReport',
    mixins: [CallPromiseMixin],
    validate: null,
    run(params) {
        if (!this.isSimulation) {
            Meteor._sleepForMs(200);
            let selector = {};
            let data = {
                title: {},
                fields: [],
                displayFields: [],
                content: [{index: 'No Result'}],
                footer: {}
            };
            let branchId = [];
            if (params.date) {
                let date = params.date.split(',');
                data.title.date = moment(date[0]).format('DD-MM-YYYY') + ' - ' + moment(date[1]).format('DD-MM-YYYY');
                selector.inventoryDate = {
                    $gte: moment(date[0]).startOf('days').toDate(),
                    $lte: moment(data[1]).endOf('days').toDate()
                };
            }
            if (params.branch) {
                let branch = '';
                let branchArr = params.branch.split(',');
                for(let i = 0; i < branchArr.length; i++){
                    branch += Branch.findOne(branchArr[i]).khName + ', ' || '';
                }
                branchId = params.branch.split(',');
                data.title.branch = branch;
                selector.branchId = {
                    $in: branchId
                };
                selector = ReportFn.checkIfUserHasRights({currentUser: Meteor.userId(), selector});
            }
            if (params.items) {
                let items = params.items.split(',');
                selector.itemId = {
                    $in: items
                }
            }
            if (params.location) {
                let locations = params.location.split(',');
                selector.stockLocationId = {
                    $in: locations
                }
            }
            let inventoryDocs = AverageInventories.aggregate([
                {
                    $facet: {
                        stockDate: [
                            {
                                $match: selector
                            },
                            {$sort: {inventoryDate: 1}},
                            {
                                $project: {
                                    inventoryDate: 1
                                }
                            },
                            {
                                $group: {
                                    _id: {
                                        day: {$dayOfMonth: "$inventoryDate"},
                                        month: {$month: "$inventoryDate"},
                                        year: {$month: "$inventoryDate"}
                                    },
                                    items: {$last: {$ifNull: ["$Fkyou", []]}},
                                    inventoryDate: {$last: '$inventoryDate'}
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    items: 1,
                                    inventoryDate: 1
                                }
                            }
                        ],
                        invoices: [
                            {
                                $match: {
                                    type: "invoice",
                                    inventoryDate: {$gte: selector.inventoryDate.$gte, $lte: selector.inventoryDate.$lte},
                                    branchId: handleUndefined(selector.branchId),
                                    stockLocationId: handleUndefined(selector.stockLocationId),
                                    itemId: handleUndefined(selector.itemId)
                                }
                            },
                            {
                                $group: groupLast()
                            },
                            {
                                $lookup: {
                                    from: 'cement_item',
                                    localField: 'itemId',
                                    foreignField: '_id',
                                    as: 'itemDoc'
                                }
                            },
                            {
                                $unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $lookup: {
                                    from: "cement_invoices",
                                    localField: "refId",
                                    foreignField: "_id",
                                    as: "invoiceDoc"
                                }
                            }, {
                                $unwind: {
                                    path: '$invoiceDoc', preserveNullAndEmptyArrays: true
                                }
                            },
                            {
                                $lookup: {
                                    from: 'core_branch',
                                    localField: 'branchId',
                                    foreignField: '_id',
                                    as: 'branchDoc'
                                }
                            },
                            {
                                $unwind: {path: '$branchDoc', preserveNullAndEmptyArrays: true}
                            },

                            {
                                $project: projectionField({
                                    description: {$ifNull: ["$invoiceDescription", 'លក់ចេញ(Invoice)']},
                                    number: {$ifNull: ['$invoiceDoc.voucherId', '$invoiceDoc._id']},
                                    name: {$ifNull: ['$invoiceDoc._customer.name', "Removed Invoice"]},
                                    rep: '$invoiceDoc._rep.name',
                                    item: '$itemDoc',
                                    opDate: '$invoiceDoc.invoiceDate'
                                })
                            }
                        ],
                        invoicesFree: [
                            {
                                $match: {
                                    type: "invoice-free",
                                    inventoryDate: {$gte: selector.inventoryDate.$gte, $lte: selector.inventoryDate.$lte},
                                    branchId: handleUndefined(selector.branchId),
                                    stockLocationId: handleUndefined(selector.stockLocationId),
                                    itemId: handleUndefined(selector.itemId)
                                }
                            },
                            {
                                $group: groupLast()
                            },
                            {
                                $lookup: {
                                    from: 'cement_item',
                                    localField: 'itemId',
                                    foreignField: '_id',
                                    as: 'itemDoc'
                                }
                            },
                            {
                                $unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $lookup: {
                                    from: "cement_invoices",
                                    localField: "refId",
                                    foreignField: "_id",
                                    as: "invoiceDoc"
                                }
                            }, {
                                $unwind: {
                                    path: '$invoiceDoc', preserveNullAndEmptyArrays: true
                                }
                            },
                            {
                                $lookup: {
                                    from: 'core_branch',
                                    localField: 'branchId',
                                    foreignField: '_id',
                                    as: 'branchDoc'
                                }
                            },
                            {
                                $unwind: {path: '$branchDoc', preserveNullAndEmptyArrays: true}
                            },

                            {
                                $project: projectionField({
                                    description: {$ifNull: ["$invoiceDescription", 'Free Item(Invoice)']},
                                    number: {$ifNull: ['$invoiceDoc.voucherId', '$invoiceDoc._id']},
                                    name: {$ifNull: ['$invoiceDoc._customer.name', 'Removed Invoice-Free']},
                                    rep: '$invoiceDoc._rep.name',
                                    item: '$itemDoc',
                                    opDate: '$invoiceDoc.invoiceDate'
                                })
                            }
                        ],
                        bills: [
                            {
                                $match: {
                                    type: "insert-bill",
                                    inventoryDate: {$gte: selector.inventoryDate.$gte, $lte: selector.inventoryDate.$lte},
                                    branchId: handleUndefined(selector.branchId),
                                    stockLocationId: handleUndefined(selector.stockLocationId),
                                    itemId: handleUndefined(selector.itemId)
                                }
                            },
                            {
                                $group: groupLast()
                            },
                            {
                                $lookup: {
                                    from: "cement_enterBills",
                                    localField: "refId",
                                    foreignField: "_id",
                                    as: "billDoc"
                                }
                            }, {
                                $unwind: {
                                    path: '$billDoc', preserveNullAndEmptyArrays: true
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
                            {
                                $unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $lookup: {
                                    from: 'core_branch',
                                    localField: 'branchId',
                                    foreignField: '_id',
                                    as: 'branchDoc'
                                }
                            },
                            {
                                $unwind: {path: '$branchDoc', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $project: projectionField({
                                    description: {$ifNull: ["$billDescription", 'ទិញចូល(Purchase)']},
                                    number: {$ifNull: ['$billDoc.voucherId', '$billDoc._id']},
                                    name: {$ifNull: ['$billDoc._vendor.name', 'Removed Purchase']},
                                    rep: {$ifNull: ["$billDoc._rep.name", ""]},
                                    item: '$itemDoc',
                                    opDate: '$billDoc.enterBillDate'
                                })

                            }
                        ],
                        invoiceBills: [
                            {
                                $match: {
                                    type: "invoice-bill",
                                    inventoryDate: {$gte: selector.inventoryDate.$gte, $lte: selector.inventoryDate.$lte},
                                    branchId: handleUndefined(selector.branchId),
                                    stockLocationId: handleUndefined(selector.stockLocationId),
                                    itemId: handleUndefined(selector.itemId)
                                }
                            },
                            {
                                $group: groupLast()
                            },
                            {
                                $lookup: {
                                    from: "cement_enterBills",
                                    localField: "refId",
                                    foreignField: "_id",
                                    as: "billDoc"
                                }
                            }, {
                                $unwind: {
                                    path: '$billDoc', preserveNullAndEmptyArrays: true
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
                            {
                                $unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $lookup: {
                                    from: 'core_branch',
                                    localField: 'branchId',
                                    foreignField: '_id',
                                    as: 'branchDoc'
                                }
                            },
                            {
                                $unwind: {path: '$branchDoc', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $project: projectionField({
                                    description: {$ifNull: ["$billDescription", 'កាត់ស្តុកសម្រាប់ INV(Stock out)']},
                                    number: {$ifNull: ['$billDoc.voucherId', '$billDoc._id']},
                                    name: {$ifNull: ['$billDoc._vendor.name', 'Removed Invoice-Bill']},
                                    rep: {$ifNull: ["$billDoc._rep.name", ""]},
                                    item: '$itemDoc',
                                    opDate: '$billDoc.enterBillDate'
                                })

                            }
                        ],
                        reduceFromBills: [
                            {
                                $match: {
                                    type: "reduce-from-bill",
                                    inventoryDate: {$gte: selector.inventoryDate.$gte, $lte: selector.inventoryDate.$lte},
                                    branchId: handleUndefined(selector.branchId),
                                    stockLocationId: handleUndefined(selector.stockLocationId),
                                    itemId: handleUndefined(selector.itemId)
                                }
                            },
                            {
                                $group: groupLast()
                            },
                            {
                                $lookup: {
                                    from: "cement_enterBills",
                                    localField: "refId",
                                    foreignField: "_id",
                                    as: "billDoc"
                                }
                            }, {
                                $unwind: {
                                    path: '$billDoc', preserveNullAndEmptyArrays: true
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
                            {
                                $unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $lookup: {
                                    from: 'core_branch',
                                    localField: 'branchId',
                                    foreignField: '_id',
                                    as: 'branchDoc'
                                }
                            },
                            {
                                $unwind: {path: '$branchDoc', preserveNullAndEmptyArrays: true}
                            },
                            {
                                $project: projectionField({
                                    description: {$ifNull: ["$billDescription", 'កាត់ស្តុកចេញ(Stock out)']},
                                    number: {$ifNull: ['$billDoc.voucherId', '$billDoc._id']},
                                    name: {$ifNull: ['$billDoc._vendor.name', 'Removed Bill']},
                                    rep: {$ifNull: ["$billDoc._rep.name", ""]},
                                    item: '$itemDoc',
                                    opDate: '$billDoc.enterBillDate'
                                })

                            }
                        ],

                    },

                }
            ]);
            console.log(inventoryDocs[0])
            if (inventoryDocs[0].stockDate.length > 0) {
                inventoryDocs[0].stockDate.forEach(function (obj) {
                    let currentStockDate = moment(obj.inventoryDate).format('YYYY-MM-DD');
                    inventoryDocs[0].bills.forEach(function (bill) {
                        if (moment(currentStockDate).isSame(moment(bill.inventoryDate).format('YYYY-MM-DD'))) {
                            obj.items.push(bill);
                        }
                    });

                    inventoryDocs[0].invoices.forEach(function (invoice) {
                        if (moment(currentStockDate).isSame(moment(invoice.inventoryDate).format('YYYY-MM-DD'))) {
                            obj.items.push(invoice);
                        }
                    });
                    inventoryDocs[0].invoicesFree.forEach(function (invoice) {
                        if (moment(currentStockDate).isSame(moment(invoice.inventoryDate).format('YYYY-MM-DD'))) {
                            obj.items.push(invoice);
                        }
                    });
                    inventoryDocs[0].invoiceBills.forEach(function (invoiceBill) {
                        if (moment(currentStockDate).isSame(moment(invoiceBill.inventoryDate).format('YYYY-MM-DD'))) {
                            obj.items.push(invoiceBill);
                        }
                    });
                    inventoryDocs[0].reduceFromBills.forEach(function (invoiceBill) {
                        if (moment(currentStockDate).isSame(moment(invoiceBill.inventoryDate).format('YYYY-MM-DD'))) {
                            obj.items.push(invoiceBill);
                        }
                    });
                });
                inventoryDocs[0].stockDate.sort(compareStockDate);
                for (let i = 0; i < inventoryDocs[0].stockDate.length; i++) {
                    inventoryDocs[0].stockDate[i].items.sort(compare);
                }
                data.content = inventoryDocs[0].stockDate;
            }
            return data;
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


function projectionField({item, description, name, number, rep, opDate}) {
    return {
        _id: 1,
        branchId: 1,
        branchDoc: 1,
        stockLocationId: 1,
        itemId: 1,
        qty: 1,
        price: 1,
        amount: 1,
        lastAmount: 1,
        remainQty: 1,
        averagePrice: 1,
        type: 1,
        coefficient: 1,
        refId: 1,
        inventoryDate: 1,
        number: number,
        rep: rep,
        description: description,
        name: name,
        item: item,
        createdAt: 1,
        opDate: opDate,
    }
}
function groupLast() {
    return {
        _id: '$refId',
        branchId: {$last: '$branchId'},
        stockLocationId: {$last: '$stockLocationId'},
        itemId: {$last: '$itemId'},
        qty: {$last: '$qty'},
        price: {$last: '$price'},
        amount: {$last: '$amount'},
        lastAmount: {$last: '$lastAmount'},
        remainQty: {$last: '$remainQty'},
        averagePrice: {$last: '$averagePrice'},
        type: {$last: '$type'},
        coefficient: {$last: '$coefficient'},
        refId: {$last: '$refId'},
        createdAt: {$last: '$createdAt'},
        inventoryDate: {$last: '$inventoryDate'},
    }
}
function handleUndefined(value) {
    if (!value) {
        return {$ne: value || ''}
    }
    return value
}
function compare(a, b) {
    if (a.createdAt < b.createdAt)
        return -1;
    if (a.createdAt > b.createdAt)
        return 1;
    return 0;
}
function compareStockDate(a, b) {
    if (a.inventoryDate < b.inventoryDate)
        return -1;
    if (a.inventoryDate > b.inventoryDate)
        return 1;
    return 0;
}