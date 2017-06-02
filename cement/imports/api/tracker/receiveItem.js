Tracker.autorun(function () {
    let query = FlowRouter.query;
    if (query.get('vendorId') && query.get('type')) {
        let sub = Meteor.subscribe(`cement.${query.get('type')}`, {
            vendorId: FlowRouter.query.get('vendorId'),
            customerId: FlowRouter.query.get('customerId'),
            status: {$in: ['active', 'partial', 'closed']},
            branchId:Session.get('currentBranch')
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
});