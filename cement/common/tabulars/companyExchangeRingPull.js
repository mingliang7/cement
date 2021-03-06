import {Meteor} from 'meteor/meteor';
import {Template} from 'meteor/templating';
import {Tabular} from 'meteor/aldeed:tabular';
import {EJSON} from 'meteor/ejson';
import {moment} from 'meteor/momentjs:moment';
import {_} from 'meteor/erasaur:meteor-lodash';
import {numeral} from 'meteor/numeral:numeral';
import {lightbox} from 'meteor/theara:lightbox-helpers';

// Lib
import {tabularOpts} from '../../../core/common/libs/tabular-opts.js';

// Collection
import {CompanyExchangeRingPulls} from '../../imports/api/collections/companyExchangeRingPull.js';
import {VendorNullCollection} from '../../imports/api/collections/tmpCollection';
// Page
Meteor.isClient && require('../../imports/ui/pages/companyExchangeRingPull.html');

tabularOpts.name = 'cement.companyExchangeRingPull';
tabularOpts.collection = CompanyExchangeRingPulls;
tabularOpts.columns = [
    {title: '<i class="fa fa-bars"></i>', tmpl: Meteor.isClient && Template.Cement_companyExchangeRingPullAction},
    {data: "_id", title: "ID"},
    {
        data: "companyExchangeRingPullDate",
        title: "Date",
        render: function (val, type, doc) {
            return moment(val).format('DD/MM/YY');
        }
    },
    {data: "total", title: "Total"},
    {data: "des", title: "Description"},
    {
        data: "vendorId",
        title: "Vendor ID",
        render: function (val) {
            Meteor.call('getVendor', {vendorId: val}, function (err, result) {
                let vendor = VendorNullCollection.findOne(result._id);
                if (!vendor) {
                    VendorNullCollection.insert(result);
                }
            });
            try {
                return VendorNullCollection.findOne(val).name;

            } catch (e) {

            }
        }
    },
    {data: "status", title: "Status"},
    //{
    //    data: "_vendor",
    //    title: "Vendor Info",
    //    render: function (val, type, doc) {
    //        return JSON.stringify(val, null, ' ');
    //    }
    //}
];
tabularOpts.extraFields = ['items', 'repId','stockLocationId'];
export const CompanyExchangeRingPullTabular = new Tabular.Table(tabularOpts);
