import {ReactiveDict} from 'meteor/reactive-dict'
import {Template} from 'meteor/templating'
import {AutoForm} from 'meteor/aldeed:autoform'
import {Roles} from 'meteor/alanning:roles'
import {alertify} from 'meteor/ovcharik:alertifyjs'
import {sAlert} from 'meteor/juliancwirko:s-alert'
import {fa} from 'meteor/theara:fa-helpers'
import {lightbox} from 'meteor/theara:lightbox-helpers'
import {_} from 'meteor/erasaur:meteor-lodash'
import {$} from 'meteor/jquery'
import {TAPi18n} from 'meteor/tap:i18n'
import {ReactiveTable} from 'meteor/aslagle:reactive-table'
import 'meteor/theara:template-states'

// Lib
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js'
import {renderTemplate} from '../../../../core/client/libs/render-template.js'
import {destroyAction} from '../../../../core/client/libs/destroy-action.js'
import {displaySuccess, displayError} from '../../../../core/client/libs/display-alert.js'
import {reactiveTableSettings} from '../../../../core/client/libs/reactive-table-settings.js'
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js'

// Component
import '../../../../core/client/components/loading.js'
import '../../../../core/client/components/column-action.js'
import '../../../../core/client/components/form-footer.js'
// methods 
import {itemInfo} from '../../../common/methods/item-info'
import UnitConvertClass from '../../api/libs/unitConvertClass';

// Collection
import {ItemsSchema} from '../../api/collections/order-items.js'
import {Order} from '../../api/collections/order.js'

// Page
import './order-items.html'
// Declare template
var itemsTmpl = Template.Cement_orderItems,
    actionItemsTmpl = Template.Cement_orderItemsAction,
    editItemsTmpl = Template.Cement_orderItemsEdit,
    unitConvertOptionTmpl = Template._unitConvertOptions;

// Local collection
var itemsCollection;
var deletedItem;

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
    this.defaultItem = new ReactiveVar();
    this.unitConvert = new ReactiveVar([]);
    this.description = new ReactiveVar('');
    this.defaultBaseUnit = new ReactiveVar([]);
    this.qtyAfterConvert = new ReactiveVar(0);
    this.defaultQty = new ReactiveVar(0);
    this.transportFee = new ReactiveVar(0);
    this.autorun(() => {
        if (FlowRouter.query.get('customerId')) {
            let sub = Meteor.subscribe('cement.activeSaleOrder', {
                customerId: FlowRouter.query.get('customerId'),
                status: 'active'
            });
            if (!sub.ready()) {
                swal({
                    title: 'Pleas Wait',
                    text: 'Getting Order....', showConfirmButton: false
                })
            } else {
                setTimeout(function () {
                    swal.close()
                }, 500)
            }
        }
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
    })
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
    tableSettings: function () {
        let i18nPrefix = 'cement.order.schema';

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
                return FlowRouter.query.get('unitConvertId') ? value : Spacebars.SafeString(`<input type="text" value=${value} class="item-qty">`)
            }
        }, {
            key: 'price',
            label: __(`${i18nPrefix}.price.label`),
            fn(value, object, key) {
                return numeral(value).format('0,0.00')
            }
        }, {
            key: 'transportFee',
            label: __(`Transport Fee`),
            fn(value, obj, key) {
                return Spacebars.SafeString(`<input type="text" value=${value} class="item-transport-fee">`)
            }
        }, {
            key: 'amount',
            label: __(`${i18nPrefix}.amount.label`),
            fn(value, object, key) {
                return numeral(value).format('0,0.00')
            }
        }, {
            key: '_id',
            label() {
                return fa('bars', '', true)
            },
            headerClass: function () {
                let css = 'text-center col-action-order-item';
                return css
            },
            tmpl: actionItemsTmpl,
            sortable: false
        }];

        return reactiveTableSettings
    },
    schema() {
        return ItemsSchema
    },
    disabledAddItemBtn: function () {
        const instance = Template.instance();
        if (instance.state('tmpAmount') <= 0) {
            return {
                disabled: true
            }
        }

        return {}
    },
    total: function () {
        let total = 0;
        let getItems = itemsCollection.find();
        getItems.forEach((obj) => {
            total += obj.amount
        });
        if (Session.get('saleOrderCustomerId')) {
            Session.set('creditLimitAmount', total)
        }
        return total
    },
    price() {
        try {
            let instance = Template.instance();
            return instance.defaultPrice.get()
        } catch (error) {
        }
    },
    totalAmount() {
        try {
            let instance = Template.instance();
            return instance.defaultPrice.get() * instance.qtyAfterConvert.get()
        } catch (error) {
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
        // filter item in order-item collection
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
                break
        }
    },
    'change [name="itemId"]': function (event, instance) {
        instance.name = event.currentTarget.selectedOptions[0].text.split(' : ')[1];
        instance.defaultItem.set(event.currentTarget.value)
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
        instance.defaultPrice.set(price)
    },
    'click .js-add-item': function (event, instance) {
        let itemId = instance.$('[name="itemId"]').val();
        let qty = parseInt(instance.$('[name="qty"]').val());
        let price = math.round(parseFloat(instance.$('[name="price"]').val()), 2);
        let amount = math.round(qty * price, 2);
        let currentUnitConvertArr = instance.unitConvert.get();
        let currentUnitConvertId = FlowRouter.query.get('unitConvertId');
        if (currentUnitConvertId) {
            let currentUnitConvertObj = currentUnitConvertArr.find(o => o._id == currentUnitConvertId);
            let des = UnitConvertClass.addParamsDes({qty: instance.defaultQty.get(), unitConvert: currentUnitConvertObj});
            FlowRouter.query.set({des: des});
        }
        // Check exist
        Meteor.call('addScheme', {itemId}, function (err, result) {
            if (!_.isEmpty(result[0])) {
                result.forEach(function (item) {
                    // let schemeItem = itemsCollection.findOne({itemId: item.itemId})
                    // if(schemeItem) {
                    //     let amount = item.price * item.quantity
                    //     itemsCollection.update({itemId: schemeItem.itemId}, {$inc: {qty: item.quantity, amount: amount}})
                    // }else{
                    itemsCollection.insert({
                        unitConvertId: currentUnitConvertId,
                        itemId: item.itemId,
                        qty: item.quantity * qty,
                        price: item.price,
                        transportFee: instance.transportFee.get(),
                        amount: (item.price * item.quantity) * qty + instance.transportFee.get(),
                        name: item.itemName
                    });
                    // }
                })
            } else {
                let exist = itemsCollection.findOne({
                    itemId: itemId
                });
                if (exist) {
                    qty += parseInt(exist.qty);
                    amount = math.round(qty * price, 2) + (qty * exist.transportFee);

                    itemsCollection.update({
                        _id: exist._id
                    }, {
                        $set: {
                            qty: qty,
                            price: price,
                            amount: amount
                        }
                    })
                } else {
                    itemsCollection.insert({
                        unitConvertId: currentUnitConvertId,
                        itemId: itemId,
                        qty: qty,
                        price: price,
                        transportFee: instance.transportFee.get(),
                        amount: amount + (instance.transportFee.get() * qty),
                        name: instance.name
                    })
                }
            }
        })
    },
    // Reactive table for item
    'click .js-update-item': function (event, instance) {
        alertify.item(fa('pencil', TAPi18n.__('cement.invoice.schema.itemId.label')), renderTemplate(editItemsTmpl, this))
    },
    'click .js-destroy-item': function (event, instance) {
        event.preventDefault();
        let itemDoc = this;
        if (AutoForm.getFormId() == 'Cement_orderEdit') { // check if update form
            let isCurrentItemExistInTmpCollection = instance.data.currentItemsCollection.findOne({itemId: this.itemId}); // check if current item collection has wanted remove item
            swal({
                title: 'Are you sure?',
                text: 'លុបទំនិញមួយនេះ?',
                type: 'warning', showCancelButton: true,
                confirmButtonColor: '#DD6B55',
                confirmButtonText: 'Yes, delete it!',
                closeOnConfirm: false
            }).then(
                function () {
                    if (!deletedItem.findOne({itemId: itemDoc.itemId})) {
                        deletedItem.insert(itemDoc)
                    }
                    if (isCurrentItemExistInTmpCollection) {
                        currentItemsInUpdateForm.insert(itemDoc)
                    }
                    itemsCollection.remove({itemId: itemDoc.itemId});
                    swal.close()
                })
        } else {
            let item = itemsCollection.remove({_id: this._id});
            UnitConvertClass.removeConvertItem(item, instance,itemsCollection);
        }
    },
    'change .item-qty'(event, instance) {
        let currentQty = event.currentTarget.value;
        let itemId = $(event.currentTarget).parents('tr').find('.itemId').text();
        let currentItem = itemsCollection.findOne({itemId: itemId});
        let selector = {};
        if (currentQty != '') {
            selector.$set = {
                amount: (currentQty * currentItem.price) + (currentQty * currentItem.transportFee),
                qty: currentQty
            }
        } else {
            selector.$set = {
                amount: (1 * currentItem.price) + (1 * currentItem.transportFee),
                qty: 1
            }
        }
        itemsCollection.update({itemId: itemId}, selector)
    },
    'change .item-transport-fee'(event, instance){
        let currentTransportFee = event.currentTarget.value;
        let itemId = $(event.currentTarget).parents('tr').find('.itemId').text();
        let currentItem = itemsCollection.findOne({itemId: itemId});
        let selector = {};
        if (currentTransportFee != '') {
            selector.$set = {
                amount: (currentTransportFee * currentItem.qty) + (currentItem.qty * currentItem.price),
                transportFee: currentTransportFee
            }
        } else {
            selector.$set = {
                amount: currentItem.amount,
                transportFee: currentItem.transportFee
            }
        }
        itemsCollection.update({itemId: itemId}, selector)
    },
    'keypress .item-qty'(evt) {
        var charCode = (evt.which) ? evt.which : evt.keyCode;
        return !(charCode > 31 && (charCode < 48 || charCode > 57))
    },
    'change [name="qtyConvert"]'(event, instance) {
        let baseUnit = instance.defaultBaseUnit.get();
        if (baseUnit.length > 0) {
            let baseUnitIndex = $('[name="baseUnit"]').val();
            let baseUnitDoc = baseUnit[parseInt(baseUnitIndex) - 1];
            let currentValue = event.currentTarget.value;
            if (currentValue !== 'string' && currentValue !== null) {
                instance.defaultQty.set(parseFloat(event.currentTarget.value) * baseUnitDoc.convertAmount)
            } else {
                instance.defaultQty.set(0)
            }
        }
    },
    'change [name="baseUnit"]'(event, instance) {
        let qtyConvert = $('[name="qtyConvert"]').val();
        let currentValue = $('option:selected', event.currentTarget).attr('convertAmount');
        if (qtyConvert != '') {
            instance.defaultQty.set(parseFloat(qtyConvert) * parseFloat(currentValue))
        }
    }
});

itemsTmpl.onDestroyed(function () {
    Session.set('productFromOrderItem', undefined)
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
            )
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
                })
            } else {
                itemsCollection.remove({
                    _id: currentDoc._id
                });
                itemsCollection.insert(insertDoc)
            }
        }

        this.done()
    },
    onSuccess: function (formType, result) {
        alertify.item().close();
        displaySuccess();
        itemsCollection.remove({})
    },
    onError: function (formType, error) {
        displayError(error.message)
    }
};
AutoForm.addHooks(['Cement_orderItemsEdit'], hooksObject);

