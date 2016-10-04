require([
    '/jquery.js',
    '/lodash.core.js',
    '/mustache.js',
    '/lunr.js',
    'text!templates/insurance_list.mustache',
    'text!templates/insurance_list_split.mustache',
    'text!insurance_data.json'
], function (jquery, _, Mustache, lunr, insuranceListTemplate, insuranceListSplitTemplate, insuranceData) {

    var numPopularInsurances = 3;

    var renderInsurancesList = function (insurances, query) {
        insurances = addQueryMatches(insurances,query);
        insurances.sort(sortInsurancesAlphabetically);
        var all = insurances.slice();
        insurances.sort(sortInsurancesByPopularity);
        var top = insurances.slice(0,numPopularInsurances)
        $('#supplementary-insurance-container')
            .empty()
            .append(Mustache.to_html(insuranceListSplitTemplate,{insurances:top,title:'popular plans',query:query}))

        $('#main-insurance-container')
            .empty()
            .append(Mustache.to_html(insuranceListSplitTemplate,{insurances:all,title:'all plans',query:query,count:all.length}))
    }

    window.profile = function (term) {
        console.profile('search')
        idx.search(term)
        console.profileEnd('search')
    }

    window.search = function (term) {
        console.time('search')
        idx.search(term)
        console.timeEnd('search')
    }

    var sortInsurancesAlphabetically = function(a, b ) {
        var aPlan = a.carrier.toLowerCase() + a.plan.toLowerCase();
        var bPlan = b.carrier.toLowerCase() + b.plan.toLowerCase();
        if ( aPlan > bPlan ) return 1;
        if ( aPlan < bPlan ) return -1;
        return 0
    }

    var addQueryMatches = function (insurances, query) {
        if (query === undefined ) return insurances;
        if (query.length < 2 ) return insurances;
        var re = new RegExp(query,'gi');
        _.forEach(insurances, function(insurance) {
            insurance.carrierDisplay = insurance.carrier.replace(re,'<span class="match">$&</span>');
            insurance.planDisplay = insurance.plan.replace(re,'<span class="match">$&</span>');
        });
        return insurances
    }

    var sortInsurancesByPopularity = function(a, b ) {
        if ( a.requests > b.requests ) return -1;
        if ( a.requests < b.requests ) return 1;
        return 0
    }


    var insurances = JSON.parse(insuranceData)
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


    window.insurancesIndex = lunr(function() {
        this.field('carrier',{boost:10})
        this.field('plan')
    });

    insurances.forEach(function(i) {
        insurancesIndex.add(i);
    });


    renderInsurancesList(insurances);


    var debounce = function (fn) {
        var timeout
        return function () {
            var args = Array.prototype.slice.call(arguments),
                    ctx = this

            clearTimeout(timeout)
            timeout = setTimeout(function () {
                fn.apply(ctx, args)
            }, 100)
        }
    }

    $('input').bind('keyup', debounce(function () {
        console.log($(this).val() + ' - ' + ($(this).val() < 1) )
        if ($(this).val() < 2) {
            renderInsurancesList(insurances);
            return
        }
        var query = $(this).val()

        var results = insurancesIndex.search(query).map(function (result) {
            return insurances.filter(function (i) { return i.id === parseInt(result.ref, 10) })[0]
        })

        renderInsurancesList(results, query);
    }))


})
