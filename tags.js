require([
    '/jquery.js',
    '/lodash.js',
    '/mustache.js',
    'text!templates/carrier-list.mustache',
    'text!insurance_data.json'
], function (jquery, _, Mustache, carrierTemplate, insuranceData ) {
    var plans = JSON.parse(insuranceData)
        .map(function (raw) {
            return {
                id: raw.PlanType_ID,
                carrier: raw.Carrier,
                carrierDisplay: raw.Carrier,
                plan: raw.Plan.toString().replace(raw.Carrier + ' ', ''),
                planDisplay: raw.Plan.toString().replace(raw.Carrier + ' ', ''),
                requests: raw.Requests
            }
        })

    var plansGrouped = _.groupBy(plans, 'carrier');
    var carriers = _.keys(plansGrouped).map(function(item){
        return {carrier: item}
    });


    var renderCarriers = function (carriers) {
        console.log(carriers);
        // carriers.sort();

        $('#main-list-container')
            .empty()
            .append(Mustache.to_html(carrierTemplate,{carriers:carriers}))
    }

    renderCarriers(carriers);

    window.setCarrier = function( carrier ) {
        console.log( $(carrier).find('.item').text() );
    }

})
