//component
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js';
import {reactiveTableSettings} from '../../../../core/client/libs/reactive-table-settings.js';
import {renderTemplate} from '../../../../core/client/libs/render-template.js';
//page
import './invoiceByItem.html';
//import DI
import  'printthis';
//import collection
import {invoiceSchema} from '../../api/collections/reports/invoice';
//methods
import {invoiceByItemReport} from '../../../common/methods/reports/invoiceByItem';
//import from lib
import RangeDate from '../../api/libs/date';
import '../pages/invoice';
//state
let paramsState = new ReactiveVar();
let invoiceData = new ReactiveVar();
//declare template
let indexTmpl = Template.Cement_invoiceByItemReport,
    invoiceDataTmpl = Template.invoiceByItemReportData;
let showItemsSummary = new ReactiveVar(true);
let showInvoicesSummary = new ReactiveVar(true);
let enableSaleOrder = new ReactiveVar(false);

indexTmpl.onCreated(function () {
    this.fromDate = new ReactiveVar(moment().startOf('days').toDate());
    this.endDate = new ReactiveVar(moment().endOf('days').toDate());
    createNewAlertify('invoiceByItemReport');
    createNewAlertify('invoiceEdit', {size: 'lg'});
    paramsState.set(FlowRouter.query.params());
    this.autorun(() => {
        if (paramsState.get()) {
            swal({
                title: "Pleas Wait",
                text: "Fetching Data....", showConfirmButton: false
            });
            invoiceByItemReport.callPromise(paramsState.get())
                .then(function (result) {
                    invoiceData.set(result);
                    setTimeout(function () {
                        swal.close()
                    }, 200);
                }).catch(function (err) {
                swal.close();
                console.log(err.message);
            });

        }

    });

});
indexTmpl.onRendered(function () {
    Meteor.setTimeout(function () {
        $("table.fixed-table").fixMe();
    }, 1000)
});

indexTmpl.helpers({
    schema(){
        return invoiceSchema;
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
    'click .printReport'(event, instance){
        window.print();
    },
    'change #date-range-filter'(event, instance){
        let currentRangeDate = RangeDate[event.currentTarget.value]();
        instance.fromDate.set(currentRangeDate.start.toDate());
        instance.endDate.set(currentRangeDate.end.toDate());
    },
    'click .print'(event, instance){
        // $('#to-print').printThis();
    },
    'change .show-items-summary'(event, instance){
        if ($(event.currentTarget).prop('checked')) {
            showItemsSummary.set(true);
        } else {
            showItemsSummary.set(false);
        }
    },
    'change .select-sale-order'(event, instance){
        if ($(event.currentTarget).prop('checked')) {
            enableSaleOrder.set(true);
        } else {
            enableSaleOrder.set(false);
        }
    },
    'change .show-invoices-summary'(event, instance){
        if ($(event.currentTarget).prop('checked')) {
            showInvoicesSummary.set(true);
        } else {
            showInvoicesSummary.set(false);
        }
    },
    'click .fullScreen'(event, instance){
        $('.rpt-body').addClass('rpt');
        $('.rpt-header').addClass('rpt');
        alertify.invoiceByItemReport(fa('', ''), renderTemplate(invoiceDataTmpl)).maximize();
    }
});
invoiceDataTmpl.events({
    'click .print'(event, instance){
        $('#to-print').printThis();
    },
    'click .inv'(event, instance){
        let currentBranch = Session.get('currentBranch');
        let _id = event.currentTarget.text.trim();
        let currentInvoiceId = `${currentBranch}-20${_id}`;
        Meteor.call('getInvoice', {_id: currentInvoiceId}, function (err, result) {
            if (result) {
                if (result.status != 'closed') {
                    alertify.invoiceEdit(fa('', 'Invoice Edit'), renderTemplate(Template.Cement_invoiceEdit, result)).maximize();
                } else {
                    alertify.invoiceEdit(fa('', 'Invoice Edit'), renderTemplate(Template.Cement_invoiceShow, result)).maximize();

                }
            }
        });
    }
});
invoiceDataTmpl.onDestroyed(function () {
    $('.rpt-body').removeClass('rpt');
    $('.rpt-header').removeClass('rpt');
    enableSaleOrder.set(false);
});
invoiceDataTmpl.helpers({
    showItemsSummary(){
        return showItemsSummary.get();
    },
    showInvoicesSummary(){
        return showInvoicesSummary.get();
    },
    company(){
        let doc = Session.get('currentUserStockAndAccountMappingDoc');
        return doc.company;
    },
    data(){
        if (invoiceData.get()) {

            return invoiceData.get();
        }
    },

    display(col){
        let data = '';
        this.displayFields.forEach(function (obj) {
            if (obj.field == 'date') {
                data += `<td>${moment(col[obj.field]).format('DD/MM/YY')}</td>`
            } else if (obj.field == 'invoiceId') {
                let invId = col[obj.field].substr(col[obj.field].length - 10, col[obj.field].length - 1);
                data += `<td><a class="inv cursor-pointer">${invId}</a></td>`
            }
            else if (obj.field == 'customerId') {
                data += `<td>${col._customer.name}</td>`
            } else if (obj.field == 'subAmount' || obj.field == 'tsFeeAmount' || obj.field == 'qty' || obj.field == 'tsFee' || obj.field == 'price' || obj.field == 'total' || obj.field == 'amount') {
                data += `<td class="text-right">${numeral(col[obj.field]).format('0,0.00')}</td>`
            }
            else {
                data += `<td>${col[obj.field] || ''}</td>`;
            }
        });

        return data;
    },
    getTotal(total){
        let string = '';
        let fieldLength = this.displayFields.length - 2;
        for (let i = 0; i < fieldLength; i++) {
            string += '<td></td>'
        }
        string += `<td><u>Total:</u></td><td><u>${numeral(total).format('0,0.00')}</u></td>`;
        return string;
    },
    getTotalFooter(totalSubAmount, totalTsFeeAmount, totalQty, total, n){
        let qty = totalQty ? totalQty : '';
        let string = '';
        let fieldLength = this.displayFields.length - n;
        for (let i = 0; i < fieldLength; i++) {
            string += '<td></td>'
        }
        string += `<td><b>Total:</b></td><td class="text-right"><b>${numeral(qty).format('0,0.00')}</b></td><td colspan="2"></td><td class="text-right"><b>${numeral(totalSubAmount).format('0,0.00')}$</b></td><td class="text-right"><b>${numeral(totalTsFeeAmount).format('0,0.00')}$</b></td><td class="text-right"><b>${numeral(total).format('0,0.00')}$</b></td>`;
        return string;
    },
    capitalize(customerName){
        return _.capitalize(customerName);
    },
    initializeFixedTable(){
    }
});


AutoForm.hooks({
    invoiceByItem: {
        onSubmit(doc){
            this.event.preventDefault();
            FlowRouter.query.unset();
            let params = {};
            params.branchId = Session.get('currentBranch');
            if (enableSaleOrder.get()) {
                params.so = true;
            }
            if (doc.itemId) {
                params.items = doc.itemId.join(',');
            }
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
            if (doc.branchId) {
                params.branchId = doc.branchId.join(',');
            }
            FlowRouter.query.set(params);
            paramsState.set(FlowRouter.query.params());
            return false;
        }
    }
});
//Copyright by kevin
$.fn.fixMe = function () {
    return this.each(function () {
        var $this = $(this),
            $t_fixed;

        function init() {
            $this.wrap('<div class="container-fix-header" />');
            $t_fixed = $this.clone();
            $t_fixed.find("tbody").remove().end().addClass("fixed").insertBefore($this);
            resizeFixed();
        }

        function resizeFixed() {
            $t_fixed.find("th").each(function (index) {
                $(this).css("width", $this.find("th").eq(index).outerWidth() + "px");
            });
        }

        function scrollFixed() {
            var offset = $(this).scrollTop(),
                tableOffsetTop = $this.offset().top,
                tableOffsetBottom = tableOffsetTop + $this.height() - $this.find("thead").height();
            if (offset < tableOffsetTop || offset > tableOffsetBottom)
                $t_fixed.hide();
            else if (offset >= tableOffsetTop && offset <= tableOffsetBottom && $t_fixed.is(":hidden"))
                $t_fixed.show();
        }

        $(window).resize(resizeFixed);
        $(window).scroll(scrollFixed);
        init();
    });
}