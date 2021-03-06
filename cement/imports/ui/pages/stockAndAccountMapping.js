import {Template} from 'meteor/templating';
import {AutoForm} from 'meteor/aldeed:autoform';
import {Roles} from  'meteor/alanning:roles';
import {alertify} from 'meteor/ovcharik:alertifyjs';
import {sAlert} from 'meteor/juliancwirko:s-alert';
import {fa} from 'meteor/theara:fa-helpers';
import {lightbox} from 'meteor/theara:lightbox-helpers';
import {TAPi18n} from 'meteor/tap:i18n';
import {ReactiveTable} from 'meteor/aslagle:reactive-table';
import {moment} from 'meteor/momentjs:moment';

// Lib
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js';
import {reactiveTableSettings} from '../../../../core/client/libs/reactive-table-settings.js';
import {renderTemplate} from '../../../../core/client/libs/render-template.js';
import {destroyAction} from '../../../../core/client/libs/destroy-action.js';
import {displaySuccess, displayError} from '../../../../core/client/libs/display-alert.js';
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js';

// Component
import '../../../../core/client/components/loading.js';
import '../../../../core/client/components/column-action.js';
import '../../../../core/client/components/form-footer.js';

// Collection
import {StockAndAccountMapping} from '../../api/collections/stockAndAccountMapping.js';
import {nullCollection} from '../../api/collections/tmpCollection';
// Tabular
import {StockAndAccountMappingTabular} from '../../../common/tabulars/stockAndAccountMapping.js';

// Page
import './stockAndAccountMapping.html';

// Declare template
let indexTmpl = Template.Cement_stockAndAccountMapping,
    actionTmpl = Template.Cement_stockAndAccountMappingAction,
    newTmpl = Template.Cement_stockAndAccountMappingNew,
    editTmpl = Template.Cement_stockAndAccountMappingEdit,
    showTmpl = Template.Cement_stockAndAccountMappingShow;


// Index
indexTmpl.onCreated(function () {
    // Create new  alertify
    createNewAlertify('stockAndAccountMapping');
    createNewAlertify('stockAndAccountMappingShow',);

    // Reactive table filter
    this.filter = new ReactiveTable.Filter('cement.stockAndAccountMappingByBranchFilter', ['branchId']);
    this.autorun(()=> {
        this.filter.set(Session.get('currentBranch'));
    });
});


indexTmpl.helpers({
    tabularTable(){
        return StockAndAccountMappingTabular;
    }
});

indexTmpl.events({
    'click .js-create' (event, instance) {
        alertify.stockAndAccountMapping(fa('plus', TAPi18n.__('cement.stockAndAccountMapping.title')), renderTemplate(newTmpl));
    },
    'click .js-update' (event, instance) {
        alertify.stockAndAccountMapping(fa('pencil', TAPi18n.__('cement.stockAndAccountMapping.title')), renderTemplate(editTmpl, this));
    },
    'click .js-destroy' (event, instance) {
        destroyAction(
            StockAndAccountMapping,
            {_id: this._id},
            {title: TAPi18n.__('cement.stockAndAccountMapping.title'), itemTitle: this._id}
        );
    },
    'click .js-display' (event, instance) {
        alertify.stockAndAccountMappingShow(fa('eye', TAPi18n.__('cement.stockAndAccountMapping.title')), renderTemplate(showTmpl, this));
    }
});
// destroy

indexTmpl.onDestroyed(function () {
    nullCollection.remove({});

});

// New
newTmpl.helpers({
    collection(){
        return StockAndAccountMapping;
    },
    userBranches(){
        let user = Session.get('userBranches');
        if(user) {
            return `<label class="label label-success">(${user.rolesBranch.join(', ')})</label>`;
        }
        return ''
    }
});
newTmpl.onDestroyed(function () {
    Session.set('userBranches', undefined);
});
newTmpl.events({
    'change [name="userId"]'(event,instance){
        Session.set("userBranches", undefined);
        if(event.currentTarget.value != '') {
            Meteor.call('lookupUserBranch', event.currentTarget.value,function(err,result) {
                Session.set("userBranches", result);
            })
        }
    }
});
// Edit


editTmpl.helpers({
    collection(){
        return StockAndAccountMapping;
    },
    data () {
        let data = this;
        return data;
    },
    userBranches(){
        let user = Session.get('userBranches');
        if(user) {
            return `<label class="label label-success">(${user.rolesBranch.join(', ')})</label>`;
        }
        return ''
    }
});
editTmpl.events({
    'change [name="userId"]'(event,instance){
        Session.set("userBranches", undefined);
        if(event.currentTarget.value != '') {
            Meteor.call('lookupUserBranch', event.currentTarget.value,function(err,result) {
                Session.set("userBranches", result);
            })
        }
    }
});
editTmpl.onDestroyed(function () {
    Session.set('userBranches', undefined);
});
// Show
showTmpl.onCreated(function () {
    this.autorun(()=> {
        this.subscribe('cement.stockAndAccountMapping', {_id: this.data._id});
    });
});

showTmpl.helpers({
    i18nLabel(label){
        let i18nLabel = `cement.stockAndAccountMapping.schema.${label}.label`;
        return i18nLabel;
    },
    data () {
        let data = StockAndAccountMapping.findOne(this._id);
        return data;
    }
});

// Hook
let hooksObject = {
    onSuccess (formType, result) {
        if (formType == 'update') {
            alertify.stockAndAccountMapping().close();
        }
        displaySuccess();
    },
    onError (formType, error) {
        displayError(error.message);
    }
};

AutoForm.addHooks([
    'Cement_stockAndAccountMappingNew',
    'Cement_stockAndAccountMappingEdit'
], hooksObject);
