//component
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js';
import {reactiveTableSettings} from '../../../../core/client/libs/reactive-table-settings.js';
import {renderTemplate} from '../../../../core/client/libs/render-template.js';
//page
import './customerHistory.html';
//import DI
import  'printthis';
//import collection
import {customerHistorySchema} from '../../api/collections/reports/customerHistory';

//methods
import {customerHistoryReport} from '../../../common/methods/reports/customerHistory';
import RangeDate from "../../api/libs/date";
//state
let paramsState = new ReactiveVar();
let invoiceData = new ReactiveVar();
//declare template
let indexTmpl = Template.Cement_customerHistory,
    invoiceDataTmpl = Template.customerHistoryData;
Tracker.autorun(function () {
    if (paramsState.get()) {
        swal({
            title: "Pleas Wait",
            text: "Fetching Data....", showConfirmButton: false
        });
        customerHistoryReport.callPromise(paramsState.get())
            .then(function (result) {
                invoiceData.set(result);
                setTimeout(function () {
                    swal.close()
                }, 200);
            }).catch(function (err) {
            swal.close();
            console.log(err.message);
        })
    }
});

indexTmpl.onCreated(function () {
    createNewAlertify('customerHistory');
    paramsState.set(FlowRouter.query.params());
    this.fromDate = new ReactiveVar(moment().startOf('days').toDate());
    this.endDate = new ReactiveVar(moment().endOf('days').toDate());
});
indexTmpl.helpers({
    schema(){
        return customerHistorySchema;
    },
    fromDate(){
        let instance = Template.instance();
        return instance.fromDate.get();
    },
    endDate(){
        let instance = Template.instance();
        return instance.endDate.get();
    }
});
indexTmpl.events({
    'change #date-range-filter'(event, instance){
        let currentRangeDate = RangeDate[event.currentTarget.value]();
        instance.fromDate.set(currentRangeDate.start.toDate());
        instance.endDate.set(currentRangeDate.end.toDate());
    },
    'click .printReport'(event, instance){
        window.print();
    },
});

invoiceDataTmpl.onDestroyed(function () {
    $('.rpt-header').removeClass('rpt');
    $('.rpt-body').removeClass('rpt');
    $('.sub-body').removeClass('rpt rpt-body');
    $('.sub-header').removeClass('rpt rpt-header');
});
invoiceDataTmpl.helpers({
    existPayment(paymentDate){
        return !!paymentDate;
    },
    data(){
        if (invoiceData.get()) {
            let customerHistory = invoiceData.get();
            let data = {content: [], footer: customerHistory.footer};
            let content = customerHistory.content;
            if (content.length > 0) {
                content.forEach(function (invoice) {
                    let invoiceData = invoice.data;
                    if (invoiceData.length > 0) {
                        invoiceData.forEach(function (dataDoc) {
                            let itemDoc = dataDoc.items;
                            dataDoc.firstItem = [];
                            dataDoc.secondItem = [];
                            for (let i = 0; i < itemDoc.length; i++) {
                                if (i == 0) {
                                    dataDoc.firstItem.push(itemDoc[i]);
                                } else {
                                    dataDoc.secondItem.push(itemDoc[i]);
                                }
                            }
                        });
                    }
                    data.content.push(invoice);
                });

            }
            return data;
        }
    },
    getBeginningBalance(index, balance = 0){
        let customerHistory = invoiceData.get();
        let currentMapDate = customerHistory.invoiceDateArr && customerHistory.invoiceDateArr[index];
        let subtractCurrentMapDateByOneMonth = moment(currentMapDate).subtract(1, 'months').format('YYYY-MM');
        let beginningBalance = 0;
        if (customerHistory.groupByDate.length > 0) {
            customerHistory.groupByDate.forEach(function (o) {
                let formatMonth = moment(o.invoiceDate).format('YYYY-MM');
                if(moment(formatMonth).isSame(moment(subtractCurrentMapDateByOneMonth)) || moment(formatMonth).isBefore(moment(subtractCurrentMapDateByOneMonth))) {
                    beginningBalance += o.balance;
                }
            });
        }
        return {
            balance: numeral(balance).format('0,0.00'),
            sumBalance: numeral(beginningBalance + balance).format('0,0.00'),
            beginningBalance: numeral(beginningBalance).format('0,0.00')
        };

    },
    company(){
        let doc = Session.get('currentUserStockAndAccountMappingDoc');
        return doc.company;
    },
});


AutoForm.hooks({
    customerHistoryReport: {
        onSubmit(doc){
            this.event.preventDefault();
            FlowRouter.query.unset();
            let params = {};
            params.branchId = Session.get('currentBranch');
            if (doc.date) {
                params.date = `${moment(doc.date).endOf('days').format('YYYY-MM-DD HH:mm:ss')}`;
            }
            if (doc.customer) {
                params.customer = doc.customer
            }
            if (doc.filter) {
                params.filter = doc.filter.join(',');
            }
            if (doc.branchId) {
                params.branchId = doc.branchId.join(',');
            }
            FlowRouter.query.set(params);
            paramsState.set(FlowRouter.query.params());
            return false;
        }
    }
});