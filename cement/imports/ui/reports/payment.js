//component
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js';
import {reactiveTableSettings} from '../../../../core/client/libs/reactive-table-settings.js';
import {renderTemplate} from '../../../../core/client/libs/render-template.js';
//page
import './payment.html';
//import DI
import  'printthis';
//import collection
import {paymentSchema} from '../../api/collections/reports/payment';

//methods
import {receivePaymentReport} from '../../../common/methods/reports/payment';
//state
let paramsState = new ReactiveVar();
let receivePayment = new ReactiveVar();
let skip = new ReactiveVar(0);
//declare template
let indexTmpl = Template.Cement_paymentReport,
    receivePaymentTmpl = Template.paymentReportData;
Tracker.autorun(function () {
    if (paramsState.get()) {
        swal({
            title: "Pleas Wait",
            text: "Fetching Data....", showConfirmButton: false
        });
        receivePaymentReport.callPromise(paramsState.get())
            .then(function (result) {
                receivePayment.set(result);
                setTimeout(function () {
                    swal.close()
                }, 200);
            }).catch(function (err) {
            swal.close();
        })
    }
});

indexTmpl.onCreated(function () {
    createNewAlertify('receivePaymentReport');
    createNewAlertify('showJournal');
    paramsState.set(FlowRouter.query.params());
});
indexTmpl.helpers({
    schema(){
        return paymentSchema;
    }
});
indexTmpl.events({
    'click .printRP'(event, instance){
       window.print();
    },
    'click .next'(event, instance){
        let currentParams = FlowRouter.query.params();
        let totalSkip = skip.get() + parseFloat($('[name="skip"]').val());
        skip.set(totalSkip);
        currentParams.skip = totalSkip;
        currentParams.limit = parseFloat($('[name="limit"]').val());
        FlowRouter.query.unset();
        FlowRouter.query.set(currentParams);
        paramsState.set(FlowRouter.query.params());
    },
    'click .previous'(event, instance){
        let previousSkip = skip.get() - parseFloat($('[name="skip"]').val());
        let currentParams = FlowRouter.query.params();
        let totalSkip = previousSkip < 0 ? 0 : previousSkip;
        skip.set(totalSkip);
        currentParams.skip = totalSkip;
        currentParams.limit = parseFloat($('[name="limit"]').val());
        FlowRouter.query.unset();
        FlowRouter.query.set(currentParams);
        paramsState.set(FlowRouter.query.params());
    },
    'change [name="limit"]'(event, instance){
        let limit = parseFloat(event.currentTarget.value);
        let currentParams = FlowRouter.query.params();
        let totalSkip = skip.get();
        currentParams.skip = totalSkip;
        currentParams.limit = limit;
        FlowRouter.query.unset();
        FlowRouter.query.set(currentParams);
        paramsState.set(FlowRouter.query.params());
    }
});
receivePaymentTmpl.helpers({
    company(){
        let doc = Session.get('currentUserStockAndAccountMappingDoc');
        return doc.company;
    },
    data(){
        if (receivePayment.get()) {
            return receivePayment.get();
        }
    },
    display(col){
        let data = '';
        this.displayFields.forEach(function (obj) {
            if (obj.field == 'paymentDate') {
                data += `<td>${moment(col[obj.field]).format('YYYY-MM-DD')}</td>`
            } else if (obj.field == 'customerId') {
                data += `<td>${col._customer && col._customer.name}</td>`
            } else if (obj.field == 'discount' || obj.field == 'actualDueAmount' || obj.field == 'dueAmount' || obj.field == 'paidAmount' || obj.field == 'balanceAmount') {
                data += `<td class="text-right">${numeral(col[obj.field]).format('0,0.00')}</td>`
            }else if (obj.field == 'journalDoc'){
                let arr = [];
                col[obj.field].map(function(e){
                     e.refFrom == 'ReceivePayment' && arr.push(
                        "<a class='cursor-pointer journalId'" + 'journalId="'+ e._id + '">' + e._id + "</a>"
                     )
                })
                if(arr.length > 1){
                    data += `<td class="text-right" style="background: yellow;">${arr.length > 0 ? arr.join(' | ') : 'Not Send'}</td>`                
                }else if (arr.length <=0){
                    data += `<td class="text-right" style="background: red; color: #fff">${arr.length > 0 ? arr.join(' | ') : 'Not Send '+ '<button class="rewrite btn btn-default btn-sm">Rewrite</button>'}</td>`                                    
                }
                else{
                    data += `<td class="text-right">${arr.length > 0 ? arr.join(' | ') : 'Not Send'}</td>`                
                }            }
            else {
                data += `<td >${col[obj.field]}</td>`;
            }
        });
        return data;
    },
    getTotal(actualDueAmount,discount,dueAmount, paidAmount, balanceAmount){
        let string = '';
        let checkWithAccountExist = this.displayFields.find(x => x.field == 'journalDoc');
        let fieldLength = this.displayFields.length -  (checkWithAccountExist ? 7 : 6);
        for (let i = 0; i < fieldLength; i++) {
            string += '<td></td>'
        }
        string += `<td><b>Total:</td></b><td class="text-right"><b>${numeral(actualDueAmount).format('0,0.00')}</b></td><td class="text-right"><b>${numeral(discount).format('0,0.00')}</b></td><td class="text-right"><b>${numeral(dueAmount).format('0,0.00')}</b></td>`;
        string += `<td class="text-right"><b>${numeral(paidAmount).format('0,0.00')}</b></td>`;
        string += `<td class="text-right"><b>${numeral(balanceAmount).format('0,0.00')}</b></td>`;
        return string;
    }
});
receivePaymentTmpl.events({
    'click .journalId'(event,instance){
       let journalId = $(event.currentTarget).attr('journalId');
       $.blockUI();
       Meteor.call('getJournal', {_id: journalId}, function (err, data) {
           alertify.showJournal(fa("eye", "Journal"), renderTemplate(Template.acc_journalShow, data).html);
       })
       $.unblockUI();
    }
});

AutoForm.hooks({
    receivePaymentReport: {
        onSubmit(doc){
            this.event.preventDefault();
            FlowRouter.query.unset();
            let params = {};
            params.branchId = Session.get('currentBranch');
            if (doc.fromDate && doc.toDate) {
                let fromDate = moment(doc.fromDate).startOf('days').format('YYYY-MM-DD HH:mm:ss');
                let toDate = moment(doc.toDate).endOf('days').format('YYYY-MM-DD HH:mm:ss');
                params.date = `${fromDate},${toDate}`;
            }
            if (doc.customer) {
                params.customer = doc.customer
            }
            if (doc.filter) {
                params.filter = doc.filter.join(',');
            }
            if(doc.sortBy){
                params.sortBy = doc.sortBy;
            }
            params.checkWithAccount = `${doc.checkWithAccount}`;
            FlowRouter.query.set(params);
            paramsState.set(FlowRouter.query.params());
            return false;
        }
    }
});