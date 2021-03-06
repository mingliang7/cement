import {Meteor} from 'meteor/meteor';
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {CallPromiseMixin} from 'meteor/didericis:callpromise-mixin';
import {_} from 'meteor/erasaur:meteor-lodash';
import {moment} from  'meteor/momentjs:moment';

// Collection
import {Company} from '../../../../core/imports/api/collections/company.js';
import {LendingStocks} from '../../../imports/api/collections/lendingStock';
// lib func
import {correctFieldLabel} from '../../../imports/api/libs/correctFieldLabel';
export const lendingStockReport = new ValidatedMethod({
    name: 'cement.lendingStockReport',
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
            let branch = [];
            let user = Meteor.users.findOne(Meteor.userId());
            // console.log(user);
            // let date = _.trim(_.words(params.date, /[^To]+/g));
            selector.status = {$in: ['active', 'closed']};
            if (params.date) {
                let dateAsArray = params.date.split(',')
                let fromDate = moment(dateAsArray[0]).toDate();
                let toDate = moment(dateAsArray[1]).toDate();
                data.title.date = moment(fromDate).format('YYYY-MMM-DD hh:mm a') + ' - ' + moment(toDate).format('YYYY-MMM-DD hh:mm a');
                selector.lendingStockDate = {$gte: fromDate, $lte: toDate};
            }
            if (params.vendor && params.vendor != '') {
                selector.vendorId = params.vendor;
            }
            if (params.filter && params.filter != '') {
                let filters = params.filter.split(','); //map specific field
                for (let i = 0; i < filters.length; i++) {
                    data.fields.push({field: correctFieldLabel(filters[i])});
                    data.displayFields.push({field: filters[i]});
                    project[filters[i]] = `$${filters[i]}`;
                    if (filters[i] == 'customerId') {
                        project['_customer'] = '$_customer'
                    }
                }
                data.fields.push({field: 'Total'}); //map total field for default
                data.displayFields.push({field: 'total'});
                project['total'] = '$total'; //get total projection for default
            } else {
                project = {
                    '_id': '$_id',
                    'lendingStockDate': '$lendingStockDate',
                    'vendor': '$vendorDoc',
                    'status': '$status',
                    'sumRemainQty': '$sumRemainQty',
                    'total': '$total'
                };
                data.fields = [{field: '#ID'}, {field: 'Date'}, {field: 'Vendor'}, {field: 'Telephone'},{field: 'Status'}, {field: 'Remain Qty'}, {field: 'Total'}];
                data.displayFields = [{field: '_id'}, {field: 'lendingStockDate'}, {field: 'vendor'}, {field: 'vendorTelephone'},{field: 'status'}, {field: 'sumRemainQty'}, {field: 'total'}];
            }

            /****** Title *****/
            data.title.company = Company.findOne();

            /****** Content *****/
            let lendingStocks = LendingStocks.aggregate([
                {
                    $match: selector
                },
                {
                    $lookup: {
                        from: 'Cement_vendors',
                        localField: 'vendorId',
                        foreignField: '_id',
                        as: 'vendorDoc'
                    }
                },
                {$unwind: {path: '$vendorDoc', preserveNullAndEmptyArrays: true}},
                {
                    $unwind: {path: '$items', preserveNullAndEmptyArrays: true},

                }, {
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
                        _id: '$_id',
                        data: {
                            $addToSet: project
                        },
                        items: {
                            $addToSet: {
                                qty: '$items.qty',
                                price: '$items.price',
                                amount: '$items.amount',
                                itemId: '$items.itemId',
                                itemName: '$itemDoc.name',
                                remainQty: '$items.remainQty',
                            }
                        }
                    }
                }]);
            let total = LendingStocks.aggregate(
                [
                    {
                        $match: selector
                    },
                    {
                        $group: {
                            _id: null, total: {$sum: '$total'},
                            totalRemainQty: {$sum: '$sumRemainQty'}
                        }
                    }
                ]);
            if (lendingStocks.length > 0) {
                let sortData = _.sortBy(lendingStocks[0].data, '_id');
                lendingStocks[0].data = sortData;
                data.content = lendingStocks;
                data.footer.total = total[0].total;
                data.footer.totalRemainQty = total[0].totalRemainQty
            }
            return data
        }
    }
});
