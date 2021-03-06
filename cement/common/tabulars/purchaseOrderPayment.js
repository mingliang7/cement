import {Meteor} from 'meteor/meteor';
import {Session} from 'meteor/session';
import {Template} from 'meteor/templating';
import {Tabular} from 'meteor/aldeed:tabular';
import {EJSON} from 'meteor/ejson';
import {moment} from 'meteor/momentjs:moment';
import {_} from 'meteor/erasaur:meteor-lodash';
import {numeral} from 'meteor/numeral:numeral';
import {lightbox} from 'meteor/theara:lightbox-helpers';
import {tmpCollection} from '../../imports/api/collections/tmpCollection';
// Lib
import {tabularOpts} from '../../../core/common/libs/tabular-opts.js';

// Collection
import {PurchaseOrderPayment} from '../../imports/api/collections/purchaseOrderPayment.js';

// Page
Meteor.isClient && require('../../imports/ui/pages/purchaseOrderPaymentTransaction.html');

tabularOpts.name = 'cement.purchaseOrderPaymentTransaction';
tabularOpts.collection = PurchaseOrderPayment;
tabularOpts.columns = [
    {title: '<i class="fa fa-bars"></i>', tmpl: Meteor.isClient && Template.Cement_purchaseOrderPaymentTransactionAction},
    {data: "_id", title: '#ID'},
    {data: "billId", title: "Bill ID"},
    {
        data: "billDate",
        title: "Date",
        render: function (val) {
            return moment(val).format('DD/MM/YYYY')
        }
    },
    {
        data: "_vendor.name",
        title: "Vendor",
    },
    {
        data: "_staff.username",
        title: "Staff",
    },
    {
        data: "dueAmount",
        title: "Actual Due Amount",
        render: function (val, type, doc) {
            let recalDueAmountWithDiscount = val + doc.cod || 0 + doc.benefit || 0 + doc.discount || 0;
            return numeral(recalDueAmountWithDiscount).format('0,0.00');
        }
    },
    {data: "discount", title: "Discount(%)"},
    {
        data: "dueAmount",
        title: 'Due Amount',
        render: function (val) {
            return numeral(val).format('0,0.00');
        }
    },
    // {data: "discount", title: "Discount(%)"},
    {
        data: "paidAmount",
        title: "Paid Amount",
        render: function (val) {
            return numeral(val).format('0,0.00');
        }
    },
    {
        data: 'balanceAmount',
        title: "Balance Amount",
        render: function (val) {
            if (val > 0) {
                return `<span class="text-red">${numeral(val).format('0,0.00')}</span>`
            }
            return numeral(val).format('0,0.00');
        }
    },
    // {
    //     data: 'paymentType',
    //     title: 'Type',
    //     render: function(val) {
    //         if(val == 'term') {
    //             return `<span class="label label-primary">T</span>`;
    //         }
    //         return `<span class="label label-warning">G</span>`;
    //     }
    // },

    {
        data: 'status',
        title: 'Status',
        render: function (val) {
            if (val == 'closed') {
                return `<span class="label label-success">C</span>`
            }else if(val =='partial') {
                return '<label class="label label-warning">P</label>'
            }
            return `<span class="label label-primary">A</span>`
        }
    }

// {data: "description", title: "Description"}
]
;
tabularOpts.extraFields=['paymentType'];
export const PurchaseOrderPaymentTransaction = new Tabular.Table(tabularOpts);
