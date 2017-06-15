import {Meteor} from 'meteor/meteor';
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {CallPromiseMixin} from 'meteor/didericis:callpromise-mixin';
import {_} from 'meteor/erasaur:meteor-lodash';
import {moment} from  'meteor/momentjs:moment';

// Collection
import {Company} from '../../../../core/imports/api/collections/company.js';
import {ReceivePayment} from '../../../imports/api/collections/receivePayment';
//lib func
import {correctFieldLabel} from '../../../imports/api/libs/correctFieldLabel';
export const receivePaymentReport = new ValidatedMethod({
    name: 'cement.receivePaymentReport',
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
            let sortBy = {paymentDate: 1};
            if(params.sortBy){
                let sort = params.sortBy;
                if(sort == '_id'){
                    sortBy._id = 1;
                }else if(sort == 'invoiceId'){
                    sortBy.invoiceId = 1
                }else{
                    sortBy.paymentDate = 1
                }
            }
            // let date = _.trim(_.words(params.date, /[^To]+/g));
            selector.status = {
                $in: ['partial', 'closed']
            }
            selector.branchId = params.branchId;
            if (params.date) {
                let dateAsArray = params.date.split(',');
                let fromDate = moment(dateAsArray[0]).startOf('days').toDate();
                let toDate = moment(dateAsArray[1]).endOf('days').toDate();
                data.title.date = moment(fromDate).format('DD/MM/YYYY') + ' - ' + moment(toDate).format('DD/MM/YYYY');
                selector.paymentDate = {$gte: fromDate, $lte: toDate};
            }
            if (params.customer && params.customer != '') {
                selector.customerId = params.customer;
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
                data.fields.push({field: 'Actual Due'}); //map Due Amount field for default
                data.fields.push({field: 'Discount'}); //map Due Amount field for default
                data.fields.push({field: 'Due Amount'}); //map Due Amount field for default
                data.fields.push({field: 'Paid Amount'}); //map Paid Amount field for default
                data.fields.push({field: 'Balance Amount'}); //map Balance Amount field for default
                data.fields.push({field: 'JournalId'}); //map Balance Amount field for default
                data.displayFields.push({field: 'actualDueAmount'});
                data.displayFields.push({field: 'discount'});
                data.displayFields.push({field: 'dueAmount'});
                data.displayFields.push({field: 'paidAmount'});
                data.displayFields.push({field: 'balanceAmount'});
                data.displayFields.push({field: 'journalDoc._id'});
                project['actualDueAmount'] = '$actualDueAmount'; //get total projection for default
                project['discount'] = '$discount'; //get total projection for default
                project['dueAmount'] = '$dueAmount'; //get total projection for default
                project['paidAmount'] = '$paidAmount';
                project['balanceAmount'] = '$balanceAmount';
                project['journalDoc'] = '$journalDoc';
            } else {
                project = {
                    '_id': '$_id',
                    'invoiceId': '$invoiceId',
                    'paymentDate': '$paymentDate',
                    'customerId': '$customerId',
                    '_customer': '$_customer',
                    'actualDueAmount': '$actualDueAmount',
                    'discount': '$discount',
                    'dueAmount': '$dueAmount',
                    'paidAmount': '$paidAmount',
                    'balanceAmount': '$balanceAmount',
                    'journalDoc': '$journalDoc'
                };
                data.fields = [
                    {field: '#ID'}, 
                    {field: '#Invoice'}, 
                    {field: 'Date'},
                    {field: 'Customer'}, 
                    {field: 'Acutal Due'},
                    {field: 'Discount'},
                    {field: 'Due Amount'},
                    {field: 'Paid Amount'},
                    {field: 'Balance Amount'},
                    {field: 'JournalId'}]
                data.displayFields = [
                    {field: '_id'}, 
                    {field: 'invoiceId'}, 
                    {field: 'paymentDate'}, 
                    {field: 'customerId'},
                    {field: 'actualDueAmount'}, 
                    {field: 'discount'}, 
                    {field: 'dueAmount'}, 
                    {field: 'paidAmount'}, 
                    {field: 'balanceAmount'},
                    {field: 'journalDoc'}]
            }
            if(params.checkWithAccount == 'false'){
                data.displayFields = data.displayFields.filter(function(e){
                    return e.field != 'journalDoc';
                })
                data.fields = data.fields.filter(function(e){
                    return e.field != 'JournalId';                    
                })
            }
            /****** Title *****/
            data.title.company = Company.findOne();

            /****** Content *****/
            let receivePayments = ReceivePayment.aggregate([
                {
                    $match: selector
                },
                {
                    $lookup: {
                        from: 'cement_customers',
                        localField: 'customerId',
                        foreignField: '_id',
                        as: '_customer'
                    }
                },
                {
                    $lookup: {
                        from: 'accJournal',
                        localField: '_id',
                        foreignField: 'refId',
                        as: 'journalDoc'
                    }
                },
                {$unwind: {path: '$_customer', preserveNullAndEmptyArrays: true}},
                {
                    $project: {
                        actualDueAmount: {
                            $add: ['$dueAmount', '$discount']
                        },
                        _customer: 1,
                        _id: 1,
                        invoiceId: 1,
                        paymentDate: 1,
                        discount: 1,
                        paymentType: 1,
                        penalty: 1,
                        status: 1,
                        dueAmount: 1,
                        balanceAmount: 1,
                        paidAmount: 1,
                        journalDoc: 1
                    }
                },
                {
                    $sort: sortBy
                },
                {
                    $group: {
                        _id: null,
                        data: {
                            $push: project
                        },
                        dueAmount: {
                            $sum: '$dueAmount'
                        },
                        balanceAmount: {
                            $sum: '$balanceAmount'
                        },
                        paidAmount: {
                            $sum: '$paidAmount'
                        },
                        actualDueAmount: {
                            $sum: '$actualDueAmount'
                        },
                        discount:{
                            $sum: '$discount'
                        }
                    }
                }]);
            if (receivePayments.length > 0) {
                data.content = receivePayments[0].data;
                data.footer.dueAmount=receivePayments[0].dueAmount;
                data.footer.balanceAmount=receivePayments[0].balanceAmount;
                data.footer.paidAmount=receivePayments[0].paidAmount;
                data.footer.actualDueAmount=receivePayments[0].actualDueAmount;
                data.footer.discount=receivePayments[0].discount;
            }
            return data
        }
    }
});



