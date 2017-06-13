import {Order} from '../../../imports/api/collections/order';

Meteor.methods({
    printSaleOrder({invoiceId}){
        let invoice = Order.aggregate([
            {
                $match: {
                    $or: [
                        {_id: invoiceId},
                        {printId: invoiceId}
                    ]
                }
            },
            {
                $lookup: {
                    from: "cement_customers",
                    localField: "customerId",
                    foreignField: "_id",
                    as: "_customer"
                }
            },{
                $lookup: {
                    from: "cement_stockLocations",
                    localField: "stockLocationId",
                    foreignField: "_id",
                    as: "stockLocationDoc"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "staffId",
                    foreignField: "_id",
                    as: "_staff"
                }
            },

            { $unwind: { path: '$_customer', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$_staff', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$stockLocationDoc', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "cement_item",
                    localField: "items.itemId",
                    foreignField: "_id",
                    as: "items.itemDoc"
                }
            },
            { $unwind: { path: '$items.itemDoc', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "cement_unitConvert",
                    localField: 'items.unitConvertId',
                    foreignField: "_id",
                    as: 'unitConvertDoc'
                }
            },
            {
                $unwind: {
                    path: '$unitConvertDoc', preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    voucherId: 1,
                    orderDate: 1,
                    dueDate: 1,
                    deliveryDate: 1,
                    shipTo: 1,
                    _rep: 1,
                    _customer: 1,
                    _staff: 1,
                    total: 1,
                    subTotal: 1,
                    discount: 1,
                    invoiceType: 1,
                    stockLocationDoc: 1,
                    items: {
                        itemId: 1,
                        qty: 1,
                        originalQty: calculateOriginalQty(),
                        discount: {$multiply: ["$items.qty", "$items.discount"]},
                        amount: 1,
                        price: {$add: ["$items.price", "$items.transportFee"]},
                        itemName: '$items.itemDoc.name',
                        remainQty: 1,
                        _unit: 1,
                        itemDoc: {
                            _unit: 1,
                            name: { $ifNull: [{ $concat: [checkCoefficientType()] }, "$items.itemDoc.name"] }
                        },
                        unitConvertDoc: '$unitConvertDoc'
                    }
                }
            },
            {
                $group: {
                    _id: '$_id',
                    voucherId: {$last: '$voucherId'},
                    deliveryDate: {
                      $last: '$deliveryDate'
                    },
                    saleDate: {
                        $last: '$orderDate'
                    },
                    dueDate: {
                        $last: '$dueDate'
                    },
                    _customer: { $last: '$_customer' },
                    _staff: { $last: '$_staff' },
                    _rep: {$last: '$_rep'},
                    total: { $last: '$total' },
                    stockLocationDoc: {$last: '$stockLocationDoc'},
                    invoiceType: {$last: '$invoiceType'},
                    subTotal: { $last: '$subTotal' },
                    discount: { $last: '$discount' },
                    items: { $push: "$items" },
                    shipTo: {$last: '$shipTo'}
                }
            },
            {
                $lookup: {
                    from: "cement_saleOrderReceivePayment",
                    localField: "_id",
                    foreignField: "invoiceId",
                    as: "paymentDoc"
                }
            },
            { $unwind: { path: '$paymentDoc', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    sale: {
                        _id: {$ifNull: ["$voucherId","$_id"]},
                        _customer: '$_customer',
                        _staff: '$_staff',
                        _rep: '$_rep',
                        saleDate: '$saleDate',
                        dueDate: '$dueDate',
                        deliveryDate: '$deliveryDate',
                        stockLocationDoc: '$stockLocationDoc',
                        total: '$total',
                        invoiceType: '$invoiceType',
                        typeOfInvoice: {
                            $ifNull: ["$saleOrderType", "កម្ម៉ង់ទិញ"]
                        },
                        subTotal: '$subTotal',
                        discount: {
                            $ifNull: ['$discount', 0]
                        },
                        saleDetails: '$items',
                        paymentObj: {
                            paidAmount: {$sum: "$paymentDoc.paidAmount"},
                            balanceAmount: {$subtract: ['$total', {$sum: "$paymentDoc.paidAmount"}]}
                        }
                    }
                }
            }
        ]);
        if (invoice.length > 0) {
            return invoice[0];
        }
        return [{}];
    }
});

function checkCoefficientType() {
    return {
        $switch: {
            branches: [
                {
                    case: { $eq: ["$unitConvertDoc.coefficient", 'divide'] },
                    then: "&nbsp;/&nbsp;"
                },
                {
                    case: { $eq: ["$unitConvertDoc.coefficient", 'multiply'] },
                    then: "&nbsp;*&nbsp;"
                },
                {
                    case: { $eq: ["$unitConvertDoc.coefficient", 'addition'] },
                    then: "&nbsp;+&nbsp;"
                },
                {
                    case: { $eq: ["$unitConvertDoc.coefficient", 'subtract'] },
                    then: "&nbsp;-&nbsp;"
                },
            ],
            default: ''
        }
    }
}

function calculateOriginalQty() {
    return {
        $switch: {
            branches: [
                {
                    case: { $eq: ["$unitConvertDoc.coefficient", 'divide'] },
                    then: {$multiply: ["$items.qty", "$unitConvertDoc.convertAmount"]}
                },
                {
                    case: { $eq: ["$unitConvertDoc.coefficient", 'multiply'] },
                    then: {$divide: ["$items.qty", "$unitConvertDoc.convertAmount"]}
                },
                {
                    case: { $eq: ["$unitConvertDoc.coefficient", 'addition'] },
                    then: {$subtract: ["$items.qty", "$unitConvertDoc.convertAmount"]}
                },
                {
                    case: { $eq: ["$unitConvertDoc.coefficient", 'subtract'] },
                    then: {$add: ["$items.qty", "$unitConvertDoc.convertAmount"]}
                },
            ],
            default: '$items.qty'
        }
    }
}