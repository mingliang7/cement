//Collections
import {PurchaseOrder} from '../../../api/collections/purchaseOrder';
import {Item} from '../../../api/collections/item';
import {itemsCollection} from '../../../api/collections/tmpCollection';
//pages
import './purchaseOrder.html';
import {destroyAction} from '../../../../../core/client/libs/destroy-action.js';
import {displaySuccess, displayError} from '../../../../../core/client/libs/display-alert.js';
import {vendorInfo} from '../../../../common/methods/vendor.js';
import {ReceiveDeletedItem} from './receiveItem-items.js'
var purchaseOrderTmpl = Template.listPurchaseOrder;

purchaseOrderTmpl.helpers({
    purchaseOrders(){
        let item = [];
        let purchaseOrders = PurchaseOrder.find({sumRemainQty: {$gt: 0}, vendorId: FlowRouter.query.get('vendorId')}).fetch();
        if (ReceiveDeletedItem.find().count() > 0) {
            ReceiveDeletedItem.find().forEach(function (item) {
                console.log(item);
                purchaseOrder.forEach(function (purchaseOrder) {
                    purchaseOrder.items.forEach(function (purchaseOrderItem) {
                        if (purchaseOrderItem.itemId == item.itemId) {
                            purchaseOrderItem.remainQty += item.qty;
                            purchaseOrder.sumRemainQty += item.qty;
                        }
                    });
                });
            });
        }
        purchaseOrders.forEach(function (purchaseOrder) {
            purchaseOrder.items.forEach(function (purchaseOrderItem) {
                item.push(purchaseOrderItem.itemId);
            });
        });
        Session.set('purchaseOrderItems', item);
        return purchaseOrders;
    },
    hasPurchaseOrders(){
        let count = PurchaseOrder.find({sumRemainQty: {$gt: 0}, vendorId: FlowRouter.query.get('vendorId')}).count();
        return count > 0;
    },
    getItemName(itemId){
        try {
            console.log(Item.find().fetch());
            return Item.findOne(itemId).name;
        } catch (e) {

        }

    }
});

purchaseOrderTmpl.events({
    'click .add-item'(event, instance){
        event.preventDefault();
        let remainQty = $(event.currentTarget).parents('.prepaid-order-item-parents').find('.remain-qty').val();
        let purchaseOrderId = $(event.currentTarget).parents('.prepaid-order-item-parents').find('.purchaseOrderId').text().trim();
        let tmpCollection = itemsCollection.find().fetch();
        if (remainQty != '' && remainQty != '0') {
            if (this.remainQty > 0) {
                FlowRouter.query.set({id: purchaseOrderId, ref: 'purchaseOrderId'});
                if (tmpCollection.length > 0) {
                    let purchaseOrderIdExist = _.find(tmpCollection, function (o) {
                        return o.purchaseOrderId == purchaseOrderId;
                    })
                    if (purchaseOrderIdExist) {
                        insertPurchaseOrderItem({
                            self: this,
                            remainQty: parseFloat(remainQty),
                            purchaseOrderItem: purchaseOrderIdExist,
                            purchaseOrderId: purchaseOrderId
                        });
                    } else {
                        swal("Retry!", "Item Must be in the same purchaseOrderId", "warning")
                    }
                } else {
                    Meteor.call('getItem', this.itemId, (err, result)=> {
                        this.purchaseOrderId = purchaseOrderId;
                        this.qty = parseFloat(remainQty);
                        this.name = result.name;
                        this.lostQty = 0;
                        this.exactQty = parseFloat(remainQty);
                        itemsCollection.insert(this);
                    });
                    displaySuccess('Added!')
                }
            } else {
                swal("ប្រកាស!", "មុខទំនិញនេះត្រូវបានកាត់កងរួចរាល់", "info");
            }
        } else {
            swal("Retry!", "ចំនួនមិនអាចអត់មានឬស្មើសូន្យ", "warning");
        }
    },
    'change .remain-qty'(event, instance){
        event.preventDefault();
        let remainQty = $(event.currentTarget).val();
        let purchaseOrderId = $(event.currentTarget).parents('.prepaid-order-item-parents').find('.purchaseOrderId').text().trim();
        let tmpCollection = itemsCollection.find().fetch();
        if (remainQty != '' && remainQty != '0') {
            if (this.remainQty > 0) {
                FlowRouter.query.set({id: purchaseOrderId, ref: 'purchaseOrderId'});
                if (parseFloat(remainQty) > this.remainQty) {
                    remainQty = this.remainQty;
                    $(event.currentTarget).val(this.remainQty);
                }
                if (tmpCollection.length > 0) {
                    let purchaseOrderIdExist = _.find(tmpCollection, function (o) {
                        return o.purchaseOrderId == purchaseOrderId;
                    });
                    if (purchaseOrderIdExist) {
                        insertPurchaseOrderItem({
                            self: this,
                            remainQty: parseFloat(remainQty),
                            purchaseOrderItem: purchaseOrderIdExist,
                            purchaseOrderId: purchaseOrderId
                        });
                    } else {
                        swal("Retry!", "Item Must be in the same purchaseOrderId", "warning")
                    }
                } else {
                    Meteor.call('getItem', this.itemId, (err, result)=> {
                        this.purchaseOrderId = purchaseOrderId;
                        this.qty = parseFloat(remainQty);
                        this.exactQty = parseFloat(remainQty);
                        this.lostQty = 0;
                        this.name = result.name;
                        this.amount = this.qty * this.price;
                        itemsCollection.insert(this);
                    });
                    displaySuccess('Added!')
                }
            } else {
                swal("ប្រកាស!", "មុខទំនិញនេះត្រូវបានកាត់កងរួចរាល់", "info");
            }
        } else {
            swal("Retry!", "ចំនួនមិនអាចអត់មានឬស្មើសូន្យ", "warning");
        }

    }
});
//insert purchaseOrder order item to itemsCollection
let insertPurchaseOrderItem = ({self, remainQty, purchaseOrderItem, purchaseOrderId}) => {
    Meteor.call('getItem', self.itemId, (err, result)=> {
        self.purchaseOrderId = purchaseOrderId;
        self.qty = remainQty;
        self.name = result.name;
        self.lostQty = 0;
        self.amount = self.qty * self.price;
        let getItem = itemsCollection.findOne({itemId: self.itemId});
        if (getItem) {
            if (getItem.qty + remainQty <= self.remainQty) {
                itemsCollection.update(getItem._id, {$inc: {qty: self.qty, amount: self.qty * getItem.price}});
                displaySuccess('Added!')
            } else {
                swal("Retry!", `ចំនួនបញ្ចូលចាស់(${getItem.qty}) នឹងបញ្ចូលថ្មី(${remainQty}) លើសពីចំនួនកម្ម៉ង់ទិញចំនួន ${(self.remainQty)}`, "error");
            }
        } else {
            itemsCollection.insert(self);
            displaySuccess('Added!')
        }
    });
};
function excuteEditForm(doc) {
    swal({
        title: "Pleas Wait",
        text: "Getting Invoices....", showConfirmButton: false
    });
    alertify.invoice(fa('pencil', TAPi18n.__('cement.invoice.title')), renderTemplate(editTmpl, doc)).maximize();
}
