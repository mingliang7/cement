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
import {EnterBills} from '../../imports/api/collections/enterBill.js';
import {vendorBillCollection} from '../../imports/api/collections/tmpCollection';
// Page
Meteor.isClient && require('../../imports/ui/pages/enterBill.html');

tabularOpts.name = 'cement.enterBill';
tabularOpts.collection = EnterBills;
tabularOpts.columns = [
    {title: '<i class="fa fa-bars"></i>', tmpl: Meteor.isClient && Template.Cement_enterBillAction},
    {data: "_id", title: "ID"},
    {data: "voucherId", title: "Voucher"},
    {
        data: "enterBillDate",
        title: "Date",
        render: function (val, type, doc) {
            return moment(val).format('DD/MM/YYYY');
        }
    },
    {
        data: "deliveryDate",
        title: "Delivery Date",
        render: function (val, type, doc) {
            return val ? moment(val).format('DD/MM/YYYY') : '';
        }
    },
    {data: "total", title: "Total"},
    {data: "des", title: "Description"},
    {
        data: "_vendor.name",
        title: "Vendor",
    },
    {
        data: "billType",
        title: "Type",
        render: function(val) {
            if(val == 'group') {
                return `<span class="label label-warning">Group</span>`
            }
            return `<span class="label label-primary">Term</span>`
        }
    },
    {data: "_staff.username", title: "Staff"},
    {data: "stockLocationId", title: "Stock Location"},
    //{
    //    data: "_vendor",
    //    title: "Vendor Info",
    //    render: function (val, type, doc) {
    //        return JSON.stringify(val, null, ' ');
    //    }
    //}
];
tabularOpts.extraFields = ['items', 'dueDate', 'stockLocationId', 'repId', 'voucherId', 'billType', 'prepaidId', 'paymentGroupId', 'vendorId','invoiceId'];
export const EnterBillTabular = new Tabular.Table(tabularOpts);
