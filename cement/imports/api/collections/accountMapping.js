import  {SelectOpts} from '../../../../acc/imports/ui/libs/select-opts';
export const AccountMapping = new Mongo.Collection('cement_accountMapping');
AccountMapping.schema = new SimpleSchema({
    name: {
        type: String
    },
    account: {
        type: String,
        max: 200,
        optional: true,
        label: "Chart Of Account",
        autoform: {
            type: "select2",
            placeholder: "Chart Of Account",
            options: function () {
                return SelectOpts.chartAccountIntegrate();
            }
        }

    },
    isUsed:{
        type:Boolean,
        label:"Used"
    }
});
Meteor.startup(function () {
    AccountMapping.schema.i18n("cement.accountMapping.schema");
    AccountMapping.attachSchema(AccountMapping.schema);
});
