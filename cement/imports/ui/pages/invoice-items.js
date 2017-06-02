import {ReactiveDict} from 'meteor/reactive-dict';
import {Template} from 'meteor/templating';
import {AutoForm} from 'meteor/aldeed:autoform';
import {Roles} from 'meteor/alanning:roles';
import {alertify} from 'meteor/ovcharik:alertifyjs';
import {sAlert} from 'meteor/juliancwirko:s-alert';
import {fa} from 'meteor/theara:fa-helpers';
import {lightbox} from 'meteor/theara:lightbox-helpers';
import {_} from 'meteor/erasaur:meteor-lodash';
import {$} from 'meteor/jquery';
import {TAPi18n} from 'meteor/tap:i18n';
import {ReactiveTable} from 'meteor/aslagle:reactive-table';
import 'meteor/theara:template-states';

// Lib
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js';
import {renderTemplate} from '../../../../core/client/libs/render-template.js';
import {destroyAction} from '../../../../core/client/libs/destroy-action.js';
import {displaySuccess, displayError} from '../../../../core/client/libs/display-alert.js';
import {reactiveTableSettings} from '../../../../core/client/libs/reactive-table-settings.js';
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js';

// Component
import '../../../../core/client/components/loading.js';
import '../../../../core/client/components/column-action.js';
import '../../../../core/client/components/form-footer.js';

//methods
import {itemInfo} from '../../../common/methods/item-info';

// Collection
import {ItemsSchema} from '../../api/collections/order-items.js';
import {Invoices} from '../../api/collections/invoice.js';
import {Order} from '../../api/collections/order';
// Declare template
var itemsTmpl = Template.Cement_invoiceItems,
    actionItemsTmpl = Template.Cement_invoiceItemsAction,
    editItemsTmpl = Template.Cement_invoiceItemsEdit,
    unitConvertOptionTmpl = Template._unitConvertOptionsInInvoice;

//methods
import {removeItemInSaleOrder} from '../../../common/methods/sale-order';
import UnitConvertClass from '../../api/libs/unitConvertClass'
let currentItemsInUpdateForm = new Mongo.Collection(null);
let tmpDeletedItem = new Mongo.Collection(null); // use to check with credit limit
// Local collection
var itemsCollection;
export const deletedItem = new Mongo.Collection(null); //export collection deletedItem to invoice js
// Page
import './invoice-items.html';


itemsTmpl.onCreated(function () {
    // Create new  alertify
    createNewAlertify('item');
    createNewAlertify('unitConvertOptionRadioBox');
    // Data context
    let data = Template.currentData();
    itemsCollection = data.itemsCollection;

    // State
    this.state('amount', 0);
    this.defaultPrice = new ReactiveVar(0);
    this.transportFee = new ReactiveVar(0);
    this.defaultBaseUnit = new ReactiveVar([]);
    this.qtyAfterConvert = new ReactiveVar(0);
    this.defaultItem = new ReactiveVar();
    this.defaultQty = new ReactiveVar(0);
    this.discount = new ReactiveVar(0);
    this.unitConvert = new ReactiveVar([]);
    this.description = new ReactiveVar('');
    this.autorun(() => {
        if (FlowRouter.query.get('customerId')) {
            let sub = Meteor.subscribe('cement.activeSaleOrder', {
                customerId: FlowRouter.query.get('customerId'),
                status: 'active'
            });
            if (!sub.ready()) {
                swal({
                    title: "Pleas Wait",
                    text: "Getting Order....", showConfirmButton: false
                });
            } else {
                setTimeout(function () {
                    swal.close();
                }, 500);
            }

        }
        /*if (this.defaultItem.get() && (this.defaultItem.get() || this.defaultQty.get())) {
         itemInfo.callPromise({
         _id: this.defaultItem.get(),
         customerId: Session.get('getCustomerId'),
         qty: this.defaultQty.get(),
         routeName: FlowRouter.getRouteName()
         }).then((result) => {
         this.defaultPrice.set(result.price);
         }).catch((err) => {
         console.log(err.message);
         });
         }*/
        if (this.defaultItem.get() && (this.defaultItem.get() || this.defaultQty.get())) {
            itemInfo.callPromise({
                _id: this.defaultItem.get(), qty: this.defaultQty.get(), routeName: FlowRouter.getRouteName()
            }).then((result) => {
                this.transportFee.set(result.transportFee);
                this.defaultPrice.set(result.price);
                if (result.sellingUnit) {
                    this.defaultBaseUnit.set(result.sellingUnit)
                }
                if (result && result.unitConvert.length > 0) {
                    if (result.unitConvert.length == 1) {
                        let unitConvertObj = result.unitConvert[0];
                        let currentConvertQty = UnitConvertClass.convertQtyFromUnitConvert({
                            qty: this.defaultQty.get(),
                            unitConvert: unitConvertObj
                        });
                        this.qtyAfterConvert.set(currentConvertQty);
                        FlowRouter.query.set({unitConvertId: unitConvertObj._id});
                    } else {
                        this.unitConvert.set(result.unitConvert);
                        this.unitConvertArr = result.unitConvert;
                        alertify.unitConvertOptionRadioBox(fa('', 'Unit Convert Options'), renderTemplate(unitConvertOptionTmpl, this));
                    }
                }
            }).catch((err) => {
                console.log(err.message)
            })
        }
        if (this.defaultItem.get()) {
            itemInfo.callPromise({
                _id: this.defaultItem.get()
            }).then((result) => {
                this.transportFee.set(result.transportFee);
                this.defaultPrice.set(result.price);
                if (result.sellingUnit) {
                    this.defaultBaseUnit.set(result.sellingUnit)
                }
            }).catch((err) => {
                console.log(err.message)
            })
        }
    });
});
unitConvertOptionTmpl.helpers({
    unitConvertOptionData(){
        return this.unitConvertArr;
    },
    printConvertUnit(){
        let instance = Template.instance();
        let currentQty = instance.data.defaultQty.get();
        let currentConvertUnitObj = this;
        let text = '';
        if (currentConvertUnitObj.coefficient == 'divide') {
            let currentConvertValue = currentQty / currentConvertUnitObj.convertAmount;
            text = `${currentQty}${currentConvertUnitObj._unit.name} / Convert Amount: ${currentConvertUnitObj.convertAmount}=${currentConvertValue}${currentConvertUnitObj._item._unit.name}`
        } else if (currentConvertUnitObj.coefficient == 'multiply') {
            let currentConvertValue = currentQty * currentConvertUnitObj.convertAmount;
            text = `${currentQty}${currentConvertUnitObj._unit.name} * Convert Amount: ${currentConvertUnitObj.convertAmount}=${currentConvertValue}${currentConvertUnitObj._item._unit.name}`
        } else if (currentConvertUnitObj.coefficient == 'addition') {
            let currentConvertValue = currentQty + currentConvertUnitObj.convertAmount;
            text = `${currentQty}${currentConvertUnitObj._unit.name} + Convert Amount: ${currentConvertUnitObj.convertAmount}=${currentConvertValue}${currentConvertUnitObj._item._unit.name}`
        } else {
            let currentConvertValue = currentQty - currentConvertUnitObj.convertAmount;
            text = `${currentQty}${currentConvertUnitObj._unit.name} - Convert Amount: ${currentConvertUnitObj.convertAmount}=${currentConvertValue}${currentConvertUnitObj._item._unit.name}`
        }
        return text;
    }
});
unitConvertOptionTmpl.events({
    'change .unitConvertOption'(event, instance){
        let obj = instance.data.unitConvert.get();
        let _id = event.currentTarget.value;
        let unitConvertItemObj = obj.find(o => o._id == _id);
        let currentConvertQty = UnitConvertClass.convertQtyFromUnitConvert({
            qty: instance.data.defaultQty.get(),
            unitConvert: unitConvertItemObj
        });
        FlowRouter.query.set({unitConvertId: _id});
        instance.data.qtyAfterConvert.set(currentConvertQty);
    }
});
itemsTmpl.onRendered(function () {

});

itemsTmpl.helpers({
    notActivatedSaleOrder() {
        if (FlowRouter.query.get('customerId')) {
            return false;
        }
        return true;
    },
    tableSettings: function () {
        let i18nPrefix = 'cement.invoice.schema';

        reactiveTableSettings.showFilter = false;
        reactiveTableSettings.showNavigation = 'never';
        reactiveTableSettings.showColumnToggles = false;
        reactiveTableSettings.collection = itemsCollection;
        reactiveTableSettings.fields = [{
            key: 'itemId',
            label: __(`${i18nPrefix}.itemId.label`)
        }, {
            key: 'name',
            label: 'Name'
        }, {
            key: 'qty',
            label: __(`${i18nPrefix}.qty.label`),
            fn(value, obj, key) {
                return FlowRouter.query.get('customerId') || FlowRouter.query.get('unitConvertId') ? value : Spacebars.SafeString(`<input type="text" value=${value} class="item-qty">`);
            }
        }, {
            key: 'transportFee',
            label: __(`Transport Fee`),
            fn(value, obj, key) {
                return Spacebars.SafeString(`<input type="text" value=${value} class="item-transport-fee">`)
            }
        }, {
            key: 'price',
            label: __(`${i18nPrefix}.price.label`),
            fn(value, object, key) {
                return numeral(value).format('0,0.00');
            }
        }, {
            key: 'discount',
            label: __(`Discount`),
            fn(value, obj, key) {
                return FlowRouter.query.get('customerId') ? value : Spacebars.SafeString(`<input type="text" value=${value} class="item-discount">`)
            }
        }, {
            key: 'amount',
            label: __(`${i18nPrefix}.amount.label`),
            fn(value, object, key) {
                return numeral(value).format('0,0.00');
            }
        }, {
            key: '_id',
            label() {
                return fa('bars', '', true);
            },
            headerClass: function () {
                let css = 'text-center col-action-invoice-item';
                return css;
            },
            tmpl: actionItemsTmpl,
            sortable: false
        }];

        return reactiveTableSettings;
    },
    schema() {
        return ItemsSchema;
    },
    disabledAddItemBtn: function () {
        const instance = Template.instance();
        if (instance.state('tmpAmount') <= 0) {
            return {
                disabled: true
            };
        }

        return {};
    },
    subTotal(){
        try {
            let total = 0;
            let getItems = itemsCollection.find({});
            getItems.forEach((obj) => {
                total += obj.amount;
            });
            total = FlowRouter.query.get('customerId') ? 0 : total;
            if (Session.get('getCustomerId')) {
                let deletedItemsTotal = 0;
                if (AutoForm.getFormId() == "Cement_invoiceUpdate") {
                    if (currentItemsInUpdateForm.find().count() > 0) {
                        currentItemsInUpdateForm.find().forEach(function (item) {
                            deletedItemsTotal += item.amount;
                        });
                    }
                }
                Session.set('creditLimitAmount', total - deletedItemsTotal);
            }
            return total;
        } catch (error) {
            console.log(error.message);
        }
    },
    total: function () {
        try {
            let total = 0;
            let getItems = itemsCollection.find({});
            let instance = Template.instance();
            let discountInvoiceInItem = 0;
            let discount = isNaN(instance.discount.get()) || instance.discount == null ? 0 : instance.discount.get();
            getItems.forEach((obj) => {
                total += obj.amount;
                discountInvoiceInItem = obj.invoiceDiscount;
            });
            total = FlowRouter.query.get('customerId') ? 0 : total;
            if (Session.get('getCustomerId')) {
                let deletedItemsTotal = 0;
                if (AutoForm.getFormId() == "Cement_invoiceUpdate") {
                    if (currentItemsInUpdateForm.find().count() > 0) {
                        currentItemsInUpdateForm.find().forEach(function (item) {
                            deletedItemsTotal += item.amount;
                        });
                    }
                }
                Session.set('creditLimitAmount', total - deletedItemsTotal);
            }
            if (discountInvoiceInItem > 0 && discount == 0) {
                total = total > 0 ? total - discountInvoiceInItem : total;
            } else {
                total = total > 0 ? total - discount : total;
            }
            return total;
        } catch (error) {
            console.log(error.message);
        }
    },
    totalAmount() {
        try {
            let instance = Template.instance()
            return instance.defaultPrice.get() * instance.qtyAfterConvert.get()
        } catch (error) {
        }
    },
    price() {
        let instance = Template.instance();
        try {
            return instance.defaultPrice.get();
        } catch (err) {

        }
    },
    baseUnit() {
        let instance = Template.instance();
        return instance.defaultBaseUnit.get()
    },
    defaultQty() {
        let instance = Template.instance();
        return instance.qtyAfterConvert.get()
    }
});

itemsTmpl.events({
    'change [name="item-filter"]'(event, instance) {
        //filter item in order-item collection
        let currentValue = event.currentTarget.value;
        switch (currentValue) {
            case 'none-scheme':
                Session.set('itemFilterState', {scheme: {$exists: false}});
                break;
            case 'scheme':
                Session.set('itemFilterState', {scheme: {$exists: true}});
                break;
            case 'all':
                Session.set('itemFilterState', {});
                break;
        }

    },
    'change [name="itemId"]': function (event, instance) {
        instance.name = event.currentTarget.selectedOptions[0].text;
        instance.defaultItem.set(event.currentTarget.value);
    },
    'change [name="qty"]'(event, instance) {
        let qty = instance.$('[name="qty"]').val();
        qty = _.isEmpty(qty) ? 0 : parseFloat(qty);
        instance.defaultQty.set(qty);
        instance.qtyAfterConvert.set(qty);
    },
    'change [name="price"]': function (event, instance) {
        let price = instance.$('[name="price"]').val();
        price = _.isEmpty(price) ? 0 : parseFloat(price);
        instance.defaultPrice.set(price);
    },
    'click .js-add-item': function (event, instance) {
        let itemId = instance.$('[name="itemId"]').val();
        let qty = parseFloat(instance.$('[name="qty"]').val());
        let price = math.round(parseFloat(instance.$('[name="price"]').val()), 2);
        let amount = math.round(qty * price, 2);
        // Check exist
        let currentUnitConvertArr = instance.unitConvert.get();
        let currentUnitConvertId = FlowRouter.query.get('unitConvertId');
        if (currentUnitConvertId) {
            let currentUnitConvertObj = currentUnitConvertArr.find(o => o._id == currentUnitConvertId);
            let des = UnitConvertClass.addParamsDes({
                qty: instance.defaultQty.get(),
                unitConvert: currentUnitConvertObj
            });
            FlowRouter.query.set({des: des});
        }
        Meteor.call('addScheme', {itemId}, function (err, result) {
            if (!_.isEmpty(result[0])) {
                result.forEach(function (item) {
                    // let schemeItem = itemsCollection.findOne({itemId: item.itemId});
                    // if(schemeItem) {
                    //     let amount = item.price * item.quantity;
                    //     itemsCollection.update({itemId: schemeItem.itemId}, {$inc: {qty: item.quantity, amount: amount}});
                    // }else{
                    itemsCollection.insert({
                        unitConvertId: currentUnitConvertId,
                        itemId: item.itemId,
                        qty: item.quantity * qty,
                        price: item.price,
                        discount: 0,
                        transportFee: instance.transportFee.get(),
                        amount: (item.price * item.quantity) * qty + instance.transportFee.get(),
                        name: item.itemName
                    });
                    // }
                });
            } else {
                let exist = itemsCollection.findOne({
                    itemId: itemId
                });
                if (exist) {
                    qty += parseFloat(exist.qty);
                    amount = math.round(qty * price, 2) + (qty * exist.transportFee);

                    itemsCollection.update({
                        _id: exist._id
                    }, {
                        $set: {
                            qty: qty,
                            price: price,
                            amount: amount - exist.discount * exist.qty
                        }
                    });
                } else {
                    itemsCollection.insert({
                        unitConvertId: currentUnitConvertId,
                        itemId: itemId,
                        qty: qty,
                        price: price,
                        discount: 0,
                        transportFee: instance.transportFee.get(),
                        amount: amount + (instance.transportFee.get() * qty),
                        name: instance.name
                    });
                }
            }
        });
    },
    // Reactive table for item
    'click .js-update-item': function (event, instance) {
        alertify.item(fa('pencil', TAPi18n.__('cement.invoice.schema.itemId.label')), renderTemplate(editItemsTmpl, this));
    },
    'click .js-destroy-item': function (event, instance) {
        event.preventDefault();
        let itemDoc = this;
        if (AutoForm.getFormId() == "Cement_invoiceUpdate") { //check if update form
            let isCurrenctItemExistInTmpCollection = instance.data.currentItemsCollection.findOne({itemId: this.itemId}); // check if current item collection has wanted remove item
            swal({
                title: "Are you sure?",
                text: "លុបទំនិញមួយនេះ?",
                type: "warning", showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Yes, delete it!",
                closeOnConfirm: false
            }).then(
                function () {
                    if (!deletedItem.findOne({itemId: itemDoc.itemId})) {
                        deletedItem.insert(itemDoc);
                    }
                    if (isCurrenctItemExistInTmpCollection) {
                        currentItemsInUpdateForm.insert(itemDoc);
                    }
                    let item = itemsCollection.remove({itemId: itemDoc.itemId});
                    UnitConvertClass.removeConvertItem(item, instance, itemsCollection);
                    swal.close();
                });
        } else {
            let item = itemsCollection.remove({_id: this._id});
            UnitConvertClass.removeConvertItem(item, instance, itemsCollection);
        }

        if (itemsCollection.find().count() == 0) {
            FlowRouter.query.set({saleId: null});
        }
    },
    'change .item-qty'(event, instance) {
        let currentQty = event.currentTarget.value;
        let itemId = $(event.currentTarget).parents('tr').find('.itemId').text();
        let currentItem = itemsCollection.findOne({itemId: itemId});
        let selector = {};
        if (currentQty != '') {
            selector.$set = {
                amount: (currentQty * currentItem.price) + (currentQty * currentItem.transportFee) - currentItem.discount * currentQty,
                qty: currentQty
            }
        } else {
            selector.$set = {
                amount: (1 * currentItem.price) + (1 * currentItem.transportFee) - currentItem.discount * currentItem.qty,
                qty: 1
            }
        }
        itemsCollection.update({itemId: itemId}, selector);
    },
    "keypress .item-qty"(evt) {
        var charCode = (evt.which) ? evt.which : evt.keyCode;
        if ($(evt.currentTarget).val().indexOf('.') != -1) {
            if (charCode == 46) {
                return false;
            }
        }
        return !(charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57));
    },
    'change .item-discount'(event, instance) {
        let currentDiscount = event.currentTarget.value;
        let itemId = $(event.currentTarget).parents('tr').find('.itemId').text();
        let currentItem = itemsCollection.findOne({itemId: itemId});
        let selector = {};
        if (currentDiscount != '') {
            selector.$set = {
                amount: (currentItem.qty * currentItem.price + currentItem.qty * currentItem.transportFee) - parseFloat(currentDiscount) * currentItem.qty,
                discount: parseFloat(currentDiscount)
            }
        } else {
            selector.$set = {
                amount: currentItem.amount,
                discount: currentItem.discount
            };
            $(event.currentTarget).val(currentItem.discount);
        }

        itemsCollection.update({itemId: itemId}, selector)
    },
    "keypress .item-discount"(evt){
        var charCode = (evt.which) ? evt.which : evt.keyCode;
        if ($(evt.currentTarget).val().indexOf('.') != -1) {
            if (charCode == 46) {
                return false;
            }
        }
        return !(charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57));
    },
    'change [name="qtyConvert"]'(event, instance) {
        let baseUnit = instance.defaultBaseUnit.get()
        if (baseUnit.length > 0) {
            let baseUnitIndex = $('[name="baseUnit"]').val()
            let baseUnitDoc = baseUnit[parseFloat(baseUnitIndex) - 1]
            let currentValue = event.currentTarget.value
            if (currentValue !== 'string' && currentValue !== null) {
                instance.defaultQty.set(parseFloat(event.currentTarget.value) * baseUnitDoc.convertAmount)
            } else {
                instance.defaultQty.set(0)
            }
        }
    },
    'change [name="baseUnit"]'(event, instance) {
        let qtyConvert = $('[name="qtyConvert"]').val()
        let currentValue = $('option:selected', event.currentTarget).attr('convertAmount')
        if (qtyConvert != '') {
            instance.defaultQty.set(parseFloat(qtyConvert) * parseFloat(currentValue))
        }
    },
    'change .item-transport-fee'(event, instance){
        let currentTransportFee = event.currentTarget.value;
        let itemId = $(event.currentTarget).parents('tr').find('.itemId').text();
        let currentItem = itemsCollection.findOne({itemId: itemId});
        let selector = {};
        if (currentTransportFee != '') {
            selector.$set = {
                amount: (currentTransportFee * currentItem.qty) + (currentItem.qty * currentItem.price) - currentItem.discount * currentItem.qty,
                transportFee: currentTransportFee
            }
        } else {
            selector.$set = {
                amount: currentItem.amount,
                transportFee: currentItem.transportFee
            };
            $(event.currentTarget).val(currentItem.transportFee);
        }
        itemsCollection.update({itemId: itemId}, selector)
    },
    'change [name="discount"]'(event, instance){
        let currentDiscount = event.currentTarget.value;
        if (currentDiscount != '') {
            instance.discount.set(parseFloat(currentDiscount));
        } else {
            instance.discount.set(0);
            $(event.currentTarget).val(0);
        }
    },
    'keypress [name="discount"]'(evt, instance){
        var charCode = (evt.which) ? evt.which : evt.keyCode;
        if ($(evt.currentTarget).val().indexOf('.') != -1) {
            if (charCode == 46) {
                return false;
            }
        }
        return !(charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57));
    }
});
itemsTmpl.onDestroyed(function () {
    Session.set('itemFilterState', {});
});

let hooksObject = {
    onSubmit: function (insertDoc, updateDoc, currentDoc) {
        this.event.preventDefault();

        // Check old item
        if (insertDoc.itemId == currentDoc.itemId) {
            itemsCollection.update({
                    _id: currentDoc._id
                },
                updateDoc
            );
        } else {
            // Check exist item
            let exist = itemsCollection.findOne({
                _id: insertDoc._id
            });
            if (exist) {
                let newQty = exist.qty + insertDoc.qty;
                let newPrice = insertDoc.price;
                let newAmount = math.round(newQty * newPrice, 2);

                itemsCollection.update({
                    _id: insertDoc._id
                }, {
                    $set: {
                        qty: newQty,
                        price: newPrice,
                        amount: newAmount
                    }
                });
            } else {
                itemsCollection.remove({
                    _id: currentDoc._id
                });
                itemsCollection.insert(insertDoc);
            }
        }

        this.done();
    },
    onSuccess: function (formType, result) {
        alertify.item().close();
        Template.instance().defaultItem.set(undefined);
        displaySuccess();
    },
    onError: function (formType, error) {
        displayError(error.message);
    }
};
AutoForm.addHooks(['Cement_invoiceItemsEdit'], hooksObject);
