import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {AutoForm} from 'meteor/aldeed:autoform';
import {moment} from 'meteor/momentjs:moment';

// Lib
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js';
import {SelectOpts} from '../../ui/libs/select-opts.js';

export const Invoices = new Mongo.Collection("cement_invoices");
// Items sub schema
Invoices.itemsSchema = new SimpleSchema({
    itemId: {
        type: String
    },
    discount: {
        type: Number,
        decimal: true,
        optional: true
    },
    qty: {
        type: Number,
        decimal: true,
        min: 0
    },
    baseUnit: {
        type: Number,
        decimal: true,
        optional: true
    },
    transportFee: {
        type: Number,
        decimal: true,
        optional: true
    },
    price: {
        type: Number,
        decimal: true,
        autoform: {
            type: 'inputmask',
            inputmaskOptions: function () {
                return inputmaskOptions.currency();
            }
        }
    },
    amount: {
        type: Number,
        decimal: true,
        autoform: {
            type: 'inputmask',
            inputmaskOptions: function () {
                return inputmaskOptions.currency();
            }
        }
    },
    unitConvertId: {
        type: String,
        optional: true
    },
    cost: {
        type: Number,
        decimal: true,
        optional: true
    },
    amountCost: {
        type: Number,
        decimal: true,
        optional: true
    },
    profit: {
        type: Number,
        decimal: true,
        optional: true
    }
});

// Invoices schema
Invoices.schema = new SimpleSchema({
    refBillId: {
        type: String,
        optional: true
    },
    refBillDate: {
        type: Date,
        optional: true
    },
    profit: {
        type: Number,
        decimal: true,
        optional: true
    },
    totalCost: {
        type: Number,
        decimal: true,
        optional: true
    },
    voucherId: {
        type: String,
        optional: true
    },
    deliveryDate: {
        type: Date,
        autoform: {
            afFieldInput: {
                type: "bootstrap-datetimepicker",
                dateTimePickerOptions: {
                    format: 'DD/MM/YYYY',
                }
            }
        }
    },
    invoiceDate: {
        type: Date,
        // defaultValue: moment().toDate(),
        autoform: {
            afFieldInput: {
                type: "bootstrap-datetimepicker",
                dateTimePickerOptions: {
                    format: 'DD/MM/YYYY',

                },
                value(){
                    let customerId = AutoForm.getFieldValue('customerId');
                    if (customerId) {
                        return moment().toDate();
                    }
                }
            }

        }
    },
    dueDate: {
        type: Date,
        defaultValue: moment().toDate(),
        autoform: {
            afFieldInput: {
                type: "bootstrap-datetimepicker",
                dateTimePickerOptions: {
                    format: 'DD/MM/YYYY',

                }
            }
        }
    },
    customerId: {
        type: String,
        autoform: {
            type: 'universe-select',
            afFieldInput: {
                uniPlaceholder: 'Please search .... (Limit 10)',
                optionsMethod: 'cement.selectOptMethods.customer',
                optionsMethodParams: function () {
                    if (Meteor.isClient) {
                        let currentBranch = Session.get('currentBranch');
                        return {branchId: currentBranch};
                    }
                }
            }
        }
    },
    termId: {
        type: String,
        label: 'Terms',
        optional: true,
        autoform: {
            type: 'universe-select',
            afFieldInput: {
                uniPlaceholder: 'Select One'
            }
        }
    },
    paymentGroupId: {
        type: String,
        optional: true
    },
    repId: {
        type: String,
        autoform: {
            type: 'universe-select',
            afFieldInput: {
                uniPlaceholder: 'Select One'
            }
        }
    },
    staffId: {
        type: String,
        autoValue(){
            if (this.isInsert) {
                return Meteor.user()._id;
            }
        }
    },
    des: {
        type: String,
        optional: true,
        autoform: {
            afFieldInput: {
                type: 'summernote',
                class: 'editor', // optional
                settings: {
                    height: 150,                 // set editor height
                    minHeight: null,             // set minimum height of editor
                    maxHeight: null,             // set maximum height of editor
                    toolbar: [
                        ['font', ['bold', 'italic', 'underline', 'clear']], //['font', ['bold', 'italic', 'underline', 'clear']],
                        ['para', ['ul', 'ol']] //['para', ['ul', 'ol', 'paragraph']],
                        //['insert', ['link', 'picture']], //['insert', ['link', 'picture', 'hr']],
                    ]
                } // summernote options goes here
            }
        }
    },
    items: {
        type: [Invoices.itemsSchema]
    },
    total: {
        type: Number,
        decimal: true,
        autoform: {
            type: 'inputmask',
            inputmaskOptions: function () {
                return inputmaskOptions.currency();
            }
        }
    },
    stockLocationId: {
        type: String,
        autoform: {
            type: 'universe-select',
            afFieldInput: {
                uniPlaceholder: 'Select One',
                optionsMethod: 'cement.selectOptMethods.stockLocationMapping',
                optionsMethodParams: function () {
                    if (Meteor.isClient) {
                        let currentUserStockAndAccountMappingDoc = Session.get('currentUserStockAndAccountMappingDoc');
                        let stockLocations = [];
                        if (currentUserStockAndAccountMappingDoc && currentUserStockAndAccountMappingDoc.stockLocations) {
                            stockLocations = currentUserStockAndAccountMappingDoc.stockLocations;
                        }
                        let currentBranch = Session.get('currentBranch');
                        return {
                            branchId: currentBranch,
                            stockLocations: {
                                $in: stockLocations
                            }
                        };
                    }
                }
            }
        }
    },
    branchId: {
        type: String
    },
    status: {
        type: String,
        optional: true
    },
    invoiceType: {
        type: String,
        optional: true
    },
    saleId: {
        type: String,
        optional: true
    },
    subTotal: {
        type: Number,
        decimal: true,
        optional: true,
        autoform: {
            type: 'inputmask',
            inputmaskOptions: function () {
                return inputmaskOptions.currency();
            }
        }
    },
    discount: {
        type: Number,
        decimal: true,
        optional: true,
        autoform: {
            type: 'inputmask',
            inputmaskOptions: function () {
                return inputmaskOptions.currency();
            }
        }
    },
    printId: {
        type: String,
        optional: true
    },
    boid: {
        type: String,
        optional: true
    },
    truckId: {
        type: String,
        optional: true,
        autoform: {
            type: 'universe-select',
            afFieldInput: {
                uniPlaceholder: 'Please search .... (Limit 10)',
                optionsMethod: 'cement.selectOptMethods.truck',
                optionsMethodParams: function () {
                    if (Meteor.isClient) {
                        let currentBranch = Session.get('currentBranch');
                        return {branchId: currentBranch};
                    }
                }
            }
        }
    },
    shipTo: {
        type: String,
        optional: true,
        autoform: {
            type: 'textarea',
            row: 2
        }
    },
    totalDiscount: {
        type: Number,
        decimal: true,
        optional: true,
    },
    closedAt: {
        type: Date,
        optional: true
    },
    tsStatus: {
        type: String,
        optional: true
    },
    closedTsAt: {
        type: Date,
        optional: true
    }
});

Meteor.startup(function () {
    Invoices.itemsSchema.i18n("cement.invoice.schema");
    Invoices.schema.i18n("cement.invoice.schema");
    Invoices.attachSchema(Invoices.schema);
});
