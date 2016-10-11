const KEY_LEFT_ARROW = 37;
const KEY_RIGHT_ARROW = 39;
const KEY_UP_ARROW = 38;
const KEY_DOWN_ARROW = 40;
const KEY_RETURN = 13;
const KEY_TAB = 9;
const KEY_DELETE = 8;

require([
    '/jquery.js',
    '/lodash.js',
    '/mustache.js',
    '/lunr.js',
    'text!templates/carrier-initial.mustache',
    'text!templates/carrier-search.mustache',
    'text!templates/plan-initial.mustache',
    'text!templates/plan-search.mustache',
    'text!insurance_data.json',
    'text!carriers.json'
], function (jquery, _, Mustache, lunr, carrierTemplate, carrierSearchTemplate, planTemplate, planSearchTemplate, insuranceData, carrierData ) {
    var selectedCarrier = ''
    var selectedPlan = ''
    var selectedCarrierID = '';
    var currentState = 'carrier';
    var planIndex;
    var currentPlans;

    ///////////////////////////////////////////
    // setting & moving
    ///////////////////////////////////////////
    setCarrier = function( carrierListElement ) {
        console.log('setCarrier: ' + carrierListElement);
        selectedCarrier = $(carrierListElement).find('.item').text();
        selectedCarrierID = $(carrierListElement).data('carrier-id');

        $('.list__item').removeClass('selected');
        $(carrierListElement).addClass('selected')

        var $search = $('.search');
        $('.search')
            .data('selectedCarrier', selectedCarrier)
            .val('')
            .focus();

        $('.step-carrier').addClass('complete');
        $('.selected-display').addClass('active');
        $('.carrier-display').text(selectedCarrier);
        $('.plan-display').text('');
        selectedPlan = '';

        currentPlans = plansGrouped[selectedCarrier];

        planIndex = lunr(function() {
            this.field('plan')
        });

        currentPlans.forEach(function(i) {
            planIndex.add(i);
        });

        renderPlans(currentPlans);

        moveToPlan();
    }

    setPlan = function( planListElement ) {
        selectedPlan = $(planListElement).find('.item').text();

        $('.plan-container .list__item').removeClass('selected');
        $(planListElement).addClass('selected')

        $('.step-plan').addClass('complete');
        $('.search-wrapper').addClass('complete');
        $('.plan-display').text(selectedPlan);
        $('.search').blur();
        hidePicker();
    }

    moveToPlan = function() {
        $('.step').removeClass('active');
        $('.step-plan').addClass('active').removeClass('disabled');

        $('.search').attr('placeholder','search ' + truncate(selectedCarrier,18) + ' plans')
        // $('.search').attr('placeholder','search "' + truncate(selectedCarrier,16) + '" plans')
        // $('.search').attr('placeholder','search ' + selectedCarrier + ' plans')
        // $('.search').attr('placeholder','search plans for ' + selectedCarrier)
        // $('.search').attr('placeholder','search plans')

        $('.frame').addClass('show-plan');

        currentState = 'plan';
    }

    moveToCarrier = function() {
        $('.step').removeClass('active');
        $('.step-carrier').addClass('active');

        $('.search').attr('placeholder','search carriers and plans')

        $('.frame').removeClass('show-plan');

        currentState = 'carrier';
    }


    ///////////////////////////////////////////
    // render lists
    ///////////////////////////////////////////

    renderPlans = function(plans, highlightID, mode) {
        if ( mode === undefined ) mode = 'browse';

        var popular = _.sortBy(plans,'requests').reverse().slice(0,5);
        var all = _.sortBy(plans,'plan')

        $('.plan-container .sublist').not('.' + mode + '-list').removeClass('active');
        $('.plan-container .'+mode+'-list')
            .empty()
            .addClass('active')
            .append(Mustache.to_html(planTemplate,{popular:popular,all:all}))


        setPlanBehavior(highlightID);
    }

    renderPlanSearch = function(plans, query) {
        $('.plan-container .browse-list').addClass('hidden')

        var popular = _.sortBy(plans,'requests').reverse().slice(0,3);
        var all = _.sortBy(plans,'plan')
        $('.plan-container .search-list')
            .removeClass('hidden')
            .empty()
            .append(Mustache.to_html(planSearchTemplate,{popular:popular,all:all,query:query}))
        setPlanBehavior();
    }

    setPlanBehavior = function(highlightID) {
        $('.plan-container li')
            .hover(function() {
                $('.plan-container li').removeClass('highlight');
                $(this).addClass('highlight')
            })
            .click(function(){
                setPlan(this);
            });

        if (highlightID === undefined) {
            $('.plan-container li').eq(0).addClass('highlight');
        } else {
            $('.plan-container li[data-plan-id="'+ highlightID +'"]').addClass('highlight');
        }
    }


    renderCarriers = function (carriers, highlightID, mode) {

        var popular = _.sortBy(carriers,'requests').reverse().slice(0,5);
        popular = _.sortBy(popular,'carrier');
        var all = _.sortBy(carriers,'carrier')
        $('.carrier-container .browse-list')
            .empty()
            .append(Mustache.to_html(carrierTemplate,{all:all,popular:popular}))

        setCarrierBehavior(highlightID); 

        $('.see-all-link').click(function() {
            $('.all-container').toggleClass('hidden');
            $(this).text($('.all-container').hasClass('hidden')? $(this).data('off-text'):$(this).data('on-text'));
        });      
    }

    renderCarrierSearch = function(carriers, query) {
        var popular = _.sortBy(carriers,'requests').reverse().slice(0,3);
        var all = _.sortBy(carriers,'carrier')
        $('.carrier-container .browse-list').addClass('hidden')
        $('.carrier-container .search-list')
            .removeClass('hidden')
            .empty()
            .append(Mustache.to_html(carrierSearchTemplate,{all:all, popular:popular, query:query}))
        setCarrierBehavior();
    }

    setCarrierBehavior = function(highlightID) {
        $('.carrier-container li')
            .hover(function() {
                $('.carrier-container li').removeClass('highlight');
                $(this).addClass('highlight')
            })
            .click(function(){
                setCarrier(this);
            });

        if (highlightID === undefined) {
            $('.carrier-container li').first().addClass('highlight');
        } else {
            $('.carrier-container li[data-carrier-id="'+ highlightID +'"]').addClass('highlight');
        }
    }



    ///////////////////////////////////////////
    // misc
    ///////////////////////////////////////////
    truncate = function( str, numCharacters ) {
        if ( numCharacters === undefined ) numCharacters = 20;
        if ( str.length <= numCharacters ) return str;
        
        pieceLength = Math.floor(numCharacters/2);
        return str.substr(0,pieceLength) + '...' + str.substr(str.length-pieceLength);        
    }

    highlightListItem = function(itemNumber) {
        if ( itemNumber === undefined ) itemNumber = 0;
        $('.carrier-container li').eq(itemNumber).addClass('highlight');
    }

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

    ///////////////////////////////////////////
    // picker utilities
    ///////////////////////////////////////////
    showPicker = function() {
        if ( $('.picker').hasClass('active') ) return;
        $('.picker').addClass('active');
        if ( selectedCarrier != '' && selectedCarrier != '' ) {
            $('.search').val('')
            // $('.search').val(selectedPlan)
        }
        if ( $('.search').val().length > 0 ) {
            $('.clear').addClass('active');
        }
    }

    hidePicker = function() {
        $picker = $('.picker');
        $picker.removeClass('active');
        $('.clear').removeClass('active');

        if ( selectedCarrier == '' || selectedPlan == '' )   {
            $picker.addClass('incomplete');
        } else {
            $picker.removeClass('incomplete');
        }

        if ( selectedCarrier != '' && selectedPlan != '' ) {
            $('.search').val(truncate(selectedCarrier + ' - ' + selectedPlan, 30));
            // $('.search').val(truncate(selectedCarrier,14) + ' - ' + selectedPlan)
        }
    }
    
    

    

    ///////////////////////////////////////////
    // event stuff
    ///////////////////////////////////////////

    //----------------
    // clear button 
    //----------------
    toggleClear = function () {
        if ( $('.search').val().length > 0 ) {
            $('.clear').addClass('active');
        } else {
            $('.clear').removeClass('active');
        }
    }
    
    $('.clear').click(function() {
        $(this).removeClass('active');
        $('.search').val('').focus();
        clearSearchList();
    });



    //----------------
    // search field 
    //----------------
    $('.search').change(toggleClear);
    $('.search').keyup(toggleClear);

    $('.search').focus(function() {
        $(this).removeClass('incomplete')
        showPicker();
    });

    clearSearchList = function() {
        $('.' + currentState + '-container .search-list').removeClass('active');
        $('.' + currentState + '-container .browse-list').addClass('active');
    }

    $('.search').bind('keyup', debounce(function (e) {
        if ([KEY_TAB, KEY_RETURN, KEY_DOWN_ARROW, KEY_UP_ARROW].indexOf(e.keyCode) > -1 ) return;

        if ($(this).val() < 2) {
            clearSearchList();
            return
        }
        var query = $(this).val()

        if ( currentState == 'carrier' ) {
            var results = carriersIndex.search(query).map(function (result) {
                return carriers.filter(function (i) { return i.id === parseInt(result.ref, 10) })[0]
            })

            renderCarrierSearch(results, query);
        }
        
        if ( currentState == 'plan' ) {
            var results = planIndex.search(query).map(function (result) {
                return currentPlans.filter(function (i) { return i.id === parseInt(result.ref, 10) })[0]
            })

            renderPlanSearch(results, query);
        }
    }))

    //----------------
    // picker 
    //----------------
    $('.picker').get(0).onkeydown = function(e) {
        if (e.keyCode == KEY_DOWN_ARROW ) {
            var $selected = $('.'+currentState+'-container .highlight');
            if ( $selected.next().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.next().addClass('highlight');
            }
        }

        if (e.keyCode == KEY_UP_ARROW ) { 
            var $selected = $('.'+currentState+'-container .highlight');
            if ( $selected.prev().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.prev().addClass('highlight');
            }
        }

        if (e.keyCode == KEY_TAB || e.keyCode == KEY_RETURN ) {
            if (currentState == 'plan') {
                setPlan($('.plan-container .highlight').eq(0));
                return;
            }
            if (currentState == 'carrier') {
                setCarrier($('.carrier-container .highlight').eq(0));
                return;
            }
        }
    }

    

    // close the picker if anything else gets a click
    $('body').click(function(e){
        var $target = $(e.target);
        var $picker = $('.picker');
        if ( $target != $picker && $picker.find($target).length === 0 ) {
            hidePicker();
        }
    });



    //----------------
    // steps
    //----------------
    $('.step-carrier').click(function() {
        if ( currentState == 'plan' ) {
            moveToCarrier();
            return false;
        }
    });

    $('.step-plan').click(function() {
        if ( currentState != 'plan' ) {
            moveToPlan();
            return false;
        }
    });



    ///////////////////////////////////////////
    // setup
    ///////////////////////////////////////////
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

    var carriers = JSON.parse(carrierData)
        .map(function (raw) {
            return {
                id: raw.InsuranceID,
                carrier: raw['Carrier Name'],
                carrierDisplay: raw['Carrier Name'],
                requests: raw.Requests
            }
        })

    carriers = _.sortedUniqBy(carriers, 'carrier');

    var plansGrouped = _.groupBy(plans, 'carrier');

    ///////////////////////////////////////////
    // set up search
    ///////////////////////////////////////////
    window.insurancesIndex = lunr(function() {
        this.field('carrier',{boost:10})
        this.field('plan')
    });

    plans.forEach(function(i) {
        insurancesIndex.add(i);
    });

    window.carriersIndex = lunr(function() {
        this.field('carrier')
    });

    carriers.forEach(function(i) {
        carriersIndex.add(i);
    });
    
    


    ///////////////////////////////////////////
    // initialize
    ///////////////////////////////////////////

    renderCarriers(carriers);
    highlightListItem();
})
