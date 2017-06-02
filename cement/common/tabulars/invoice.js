import {Meteor} from 'meteor/meteor';
import {Templet} from 'meteor/templating';
import {Tabular} from 'meteor/aldeed:tabular';
import {EJSON} from 'meteor/ejson';
import {moment} from 'meteor/momentjs:moment';
import {_} from 'meteor/erasaur:meteor-lodash';
import {numeral} from 'meteor/numeral:numeral';
import {lightbox} from 'meteor/theara:lightbox-helpers';

// Lib
import {tabularOpts} from '../../../core/common/libs/tabular-opts.js';

// Collection
import {Invoices} from '../../imports/api/collections/invoice.js';
import {customerInvoiceCollection} from '../../imports/api/collections/tmpCollection';
// Page
Meteor.isClient && require('../../imports/ui/pages/invoice.html');

tabularOpts.name = 'cement.invoice';
tabularOpts.collection = Invoices;
tabularOpts.columns = [
    {title: '<i class="fa fa-bars"></i>', tmpl: Meteor.isClient && Template.Cement_invoiceAction},
    {
        data: "_id", title: "ID",
        render: function (val) {
            return val.substr(val.length - 10, val.length - 1);
        }
    },
    {data: "voucherId", title: "Voucher"},
    {data: "boid", title: "DO"},
    {
        data: "invoiceDate",
        title: "Date",
        render: function (val, type, doc) {
            return moment(val).format('DD/MM/YY');
        }
    }, {
        data: "deliveryDate",
        title: "Delivery Date",
        render: function (val) {
            return val ? moment(val).format('DD/MM/YY') : '';
        }
    },
    {
        data: "subTotal",
        title: "Sub Total",
        render: function (val) {
            return numeral(val).format('0,0.00');
        }
    }, {
        data: "discount",
        title: "Discount",
        render: function (val) {
            return numeral(val).format('0,0.00');
        }
    }, {
        data: "total",
        title: "Total",
        render: function (val) {
            return numeral(val).format('0,0.00');
        }
    },
    {data: "des", title: "Description"},
    {
        data: "_customer.name",
        title: "Customer"
    },
    {
        data: "_staff.username",
        title: "Staff"
    },
    {data: "invoiceType", title: "Type"},
    {data: "status", title: "Status"},
    //{
    //    data: "_customer",
    //    title: "Customer Info",
    //    render: function (val, type, doc) {
    //        return JSON.stringify(val, null, ' ');
    //    }
    //}
];
tabularOpts.extraFields = ['_id', 'boid', 'truckId', 'shipTo', 'customerId', 'items', 'dueDate', 'stockLocationId', 'repId', 'voucherId', 'invoiceType', 'saleId', 'paymentGroupId'];
export const InvoiceTabular = new Tabular.Table(tabularOpts);
