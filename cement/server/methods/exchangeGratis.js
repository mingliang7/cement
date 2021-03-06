import {ExchangeGratis} from '../../imports/api/collections/exchangeGratis';

Meteor.methods({
    exchangeGratisShowItem({_id}){
        let exchangeGratis = ExchangeGratis.aggregate([
            {$match: {_id: _id}},
            {$unwind: {path: '$items', preserveNullAndEmptyArrays: true}},
            {
                $lookup: {
                    from: "cement_item",
                    localField: "items.itemId",
                    foreignField: "_id",
                    as: "itemDoc"
                }
            },
            {
                $lookup: {
                    from: "cement_stockLocations",
                    localField: "stockLocationId",
                    foreignField: "_id",
                    as: "stockLocation"
                }
            },
            {
                $lookup: {
                    from: 'Cement_vendors',
                    localField: 'vendorId',
                    foreignField: '_id',
                    as: '_vendor'
                }
            },
            {$unwind: {path: '$itemDoc', preserveNullAndEmptyArrays: true}},
            {$unwind: {path: '$stockLocation', preserveNullAndEmptyArrays: true}},
            {$unwind: {path: '$_vendor', preserveNullAndEmptyArrays: true}},
            {
                $group: {
                    _id: '$_id',
                    items: {
                        $addToSet: {
                            itemName: '$itemDoc.name',
                            qty: '$items.qty',
                            price: '$items.price',
                            amount: '$items.amount',
                            remainQty: '$items.remainQty'
                        }
                    },
                    vendor: {$last: '$_vendor.name'},
                    branchId: {$last: '$branchId'},
                    exchangeGratisDate: {$last: '$exchangeGratisDate'},
                    status: {$last: '$status'},
                    total: {$last: '$total'},
                    voucherId: {$last: '$voucherId'},
                    _stockLocation: {$last: '$stockLocation.name'},
                    sumRemainQty: {$last: 'sumRemainQty'}
                }
            }
        ]);
        if (exchangeGratis.length > 0) {
            return exchangeGratis[0];
        }
        return {};
    }
});