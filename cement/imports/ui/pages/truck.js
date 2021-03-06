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
import {Truck} from '../../api/collections/truck.js';

// Tabular
import {TruckTabular} from '../../../common/tabulars/truck.js';

// Page
import './truck.html';

// Declare template
let indexTmpl = Template.Cement_truck,
    actionTmpl = Template.Cement_truckAction,
    newTmpl = Template.Cement_truckNew,
    editTmpl = Template.Cement_truckEdit,
    showTmpl = Template.Cement_truckShow;


// Index
indexTmpl.onCreated(function () {
    // Create new  alertify
    createNewAlertify('truck');
    createNewAlertify('truckShow',);
});


indexTmpl.helpers({
    tabularTable(){
        return TruckTabular;
    },
    selector() {
        return {branchId: Session.get('currentBranch')};
    }
});

indexTmpl.events({
    'click .js-create' (event, instance) {
        alertify.truck(fa('plus', TAPi18n.__('cement.rep.title')), renderTemplate(newTmpl));
    },
    'click .js-update' (event, instance) {
        alertify.truck(fa('pencil', TAPi18n.__('cement.rep.title')), renderTemplate(editTmpl, this));
    },
    'click .js-destroy' (event, instance) {
        var id = this._id;
        Meteor.call('isRepHasRelation', id, function (error, result) {
            if (error) {
                alertify.error(error.message);
            } else {
                if (result) {
                    alertify.warning("Data has been used. Can't remove.");
                } else {
                    destroyAction(
                        Truck,
                        {_id: id},
                        {title: TAPi18n.__('cement.rep.title'), itemTitle: id}
                    );
                }
            }
        });

    },
    'click .js-display' (event, instance) {
        alertify.truckShow(fa('eye', TAPi18n.__('cement.rep.title')), renderTemplate(showTmpl, this));
    }
});

// New
newTmpl.helpers({
    collection(){
        return Truck;
    }
});

// Edit
editTmpl.onCreated(function () {
    this.autorun(()=> {
        this.subscribe('cement.rep', {_id: this.data._id});
    });
});

editTmpl.helpers({
    collection(){
        return Truck;
    },
    data () {
        let data = Truck.findOne(this._id);
        return data;
    }
});

// Show
showTmpl.onCreated(function () {
    this.autorun(()=> {
        this.subscribe('cement.rep', {_id: this.data._id});
    });
});

showTmpl.helpers({
    i18nLabel(label){
        let i18nLabel = `cement.rep.schema.${label}.label`;
        return i18nLabel;
    },
    data () {
        let data = Truck.findOne(this._id);
        return data;
    }
});

// Hook
let hooksObject = {
    before: {
        insert(doc){
            doc.branchId = Session.get('currentBranch');
            return doc;
        }
    },
    onSuccess (formType, result) {
        if (formType == 'update') {
            alertify.truck().close();
        }
        displaySuccess();
    },
    onError (formType, error) {
        displayError(error.message);
    }
};

AutoForm.addHooks([
    'Cement_truckNew',
    'Cement_truckEdit'
], hooksObject);
