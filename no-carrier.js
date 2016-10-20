const KEY_LEFT_ARROW = 37;
const KEY_RIGHT_ARROW = 39;
const KEY_UP_ARROW = 38;
const KEY_DOWN_ARROW = 40;
const KEY_RETURN = 13;
const KEY_TAB = 9;
const KEY_DELETE = 8;

const STRINGS = {
    PLACEHOLDER: {
        CARRIER: 'insurance carrier and plan',
        BCBS:    'insurance carrier',
        PLAN:    'insurance plan'
    }
}

require([
    '/jquery.js',
    '/lodash.js',
    '/mustache.js',
    '/lunr.js',

    'text!templates/carrier-initial.mustache',
    'text!templates/carrier-search.mustache',

    'text!templates/plan-initial.mustache',
    'text!templates/plan-search.mustache',

    'text!templates/no-results.mustache',

    'text!insurance_data.json',
    'text!carriers.json'
], function (
    jquery, _, Mustache, lunr, 
    carrierTemplate, carrierSearchTemplate, 
    planTemplate, planSearchTemplate, 
    noResultsTemplate,
    insuranceData, carrierData ) {
    var selectedCarrier = ''
    var selectedBCBS = ''
    var selectedPlan = ''
    var selectedCarrierID = '';
    var payingForSelfOrChoosingLater = false;
    var currentState = 'carrier';
    var planIndex;
    var currentPlans;

    ///////////////////////////////////////////
    // display component experiment
    ///////////////////////////////////////////

    picker = {
        setComplete: function(complete) {
            if ( complete === undefined ) complete = true;
            $('.picker').toggleClass('complete', complete);
        },
        setIncomplete: function(incomplete) {
            if ( incomplete === undefined ) incomplete = true;
            $('.picker').toggleClass('incomplete', incomplete);
        },
        setVisibility: function(makeVisible) {
            if ( makeVisible === undefined ) makeVisible = true;
            $('.picker').toggleClass('active', makeVisible);
        }
    }

    search = {
        setComplete: function(complete) {
            if ( complete === undefined ) complete = true;
            $('.search-wrapper').toggleClass('complete', complete);
            $('.search').attr('readonly',complete);
        },
        setPlaceholder: function(text) {
            $('.search').attr('placeholder',text)
        },
        setValue: function(value) {
            $('.search').val(value);
        }
    }

    display = {
        setCarrier: function(value) {
            $('.selected-display__carrier').text(value);
        },

        setPlan: function(value) {
            $('.selected-display__plan').text(value);
        },

        setVisibility: function(makeVisible) {
            $('.selected-display').toggleClass('active', makeVisible);    
        }
    }

    steps = {
        setComplete: function(stepName, complete) {
            if ( complete === undefined ) complete = true;

            $('.step-'+stepName).toggleClass('complete');
        },
        setActive: function(stepName) {
            $('.step').removeClass('active');
            $('.step-'+stepName).addClass('active');
        },
        setEnabled: function(stepName, makeEnabled) {
            if ( makeEnabled === undefined ) makeEnabled = true;

            $('.step-'+stepName).toggleClass('disabled', !makeEnabled);
        },
        showBCBS: function(makeVisible) {
            if ( makeVisible === undefined ) makeVisible = true;

            
        }
    }

    lists = {
        showList: function(listName) {
            $('.lists-wrapper')
                .toggleClass('show-bcbs', listName == 'bcbs')
                .toggleClass('show-plan', listName == 'plan')
                // carrier happens by default when the other two classes are removed
        },
        clearAllHighlights: function() {
            $('.all-lists li').removeClass('highlight selected');
        }
    }

    ///////////////////////////////////////////
    // setting & moving
    ///////////////////////////////////////////

    startOver = function() {
        selectedCarrier = '';
        selectedCarrierID = '';

        currentState = 'carrier';

        display.setCarrier('');
        display.setPlan('');

        steps.setComplete('carrier', false);
        steps.setComplete('bcbs', false);
        steps.setComplete('plan', false);
        steps.setActive('carrier');

        lists.showList('carrier');
        lists.clearAllHighlights();

        picker.setComplete(false);
        picker.setVisibility(true);

        search.setValue('');
        search.setComplete(false);
        search.setPlaceholder(STRINGS.PLACEHOLDER.CARRIER);
    }

    setCarrier = function( carrierListElement ) {
        selectedCarrier = $(carrierListElement).find('.item').text();
        selectedCarrierID = $(carrierListElement).data('carrier-id');

        steps.setComplete('carrier')
        $('.picker').removeClass('complete');


        if ( selectedCarrierID == -1 ) {
            convertStepsToBCBS();
            renderBCBS(bcbs);
            moveToBCBS();
        } else if ( selectedCarrierID == -2 ) {
            chooseLater();
        } else if ( selectedCarrierID == -3 ) {
            payingForMyself();
        } else {
            convertStepsToDefault();
            setCarrierDefault(carrierListElement);
        }

    }

    setCarrierDefault = function (carrierListElement) {
        $('.list__item').removeClass('selected');
        $(carrierListElement).addClass('selected')

        var $search = $('.search');
        $('.search')
            .data('selectedCarrier', selectedCarrier)
            .val('')
            .focus();

        
        display.setVisibility(true);
        display.setCarrier(selectedCarrier)
        display.setPlan('');
        selectedPlan = '';
        payingForSelfOrChoosingLater = false;

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

        steps.setComplete('plan');
        search.setComplete();
        picker.setComplete();
        $('.selected-display__plan').text(selectedPlan);
        $('.search').blur();
        hidePicker();
    }

    moveToPlan = function() {
        $('.step').removeClass('active');
        steps.setEnabled('plan');
        steps.setActive('plan');

        search.setPlaceholder(STRINGS.PLACEHOLDER.PLAN)

        lists.showList('plan');

        currentState = 'plan';
    }

    moveToCarrier = function() {
        steps.setActive('carrier');

        search.setPlaceholder(STRINGS.PLACEHOLDER.CARRIER);

        lists.showList('carrier');

        currentState = 'carrier';
    }


    ///////////////////////////////////////////
    // not using insurance 
    ///////////////////////////////////////////

    payingForMyself = function () {
        $('.search').val("I'm paying for myself")
        payingForSelfOrChoosingLater = true;
        hidePicker();
    }

    chooseLater = function () {
        $('.search').val("I'll choose my insurance later")
        payingForSelfOrChoosingLater = true;
        hidePicker();
    }

    ///////////////////////////////////////////
    // render lists
    ///////////////////////////////////////////

    renderPlans = function(plans, highlightID, mode) {
        if ( mode === undefined ) mode = 'browse';

        var popular = _.sortBy(plans,'requests').reverse().slice(0,5);
        popular = _.sortBy(popular,'plan');
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

        var $list = $('.plan-container .search-list');

        $list
            .removeClass('hidden')
            .empty()

        if ( plans.length == 0 ) {
            $list.append(Mustache.to_html(noResultsTemplate,{type:'plans',query:query}))
            return;
        }
        
        var popular = _.sortBy(plans,'requests').reverse().slice(0,3);
        var all = _.sortBy(plans,'plan')
        $list.append(Mustache.to_html(planSearchTemplate,{popular:popular,all:all,query:query}))
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
            .append(Mustache.to_html(carrierTemplate,{all:all,popular:popular,alternates:true,entityType:'carriers'}))

        setCarrierBehavior(highlightID); 

        $('.see-all-link').click(function() {
            $('.all-container').toggleClass('hidden');
            $(this).text($('.all-container').hasClass('hidden')? $(this).data('off-text'):$(this).data('on-text'));
        });      
    }

    renderCarrierSearch = function(carriers, query) {
        $('.carrier-container .browse-list').addClass('hidden')

        var $list = $('.carrier-container .search-list');

        $list
            .removeClass('hidden')
            .empty()

        if ( carriers.length == 0 ) {
            $list.append(Mustache.to_html(noResultsTemplate,{type:'carriers',query:query}))
            return;
        }

        var popular = _.sortBy(carriers,'requests').reverse().slice(0,3);
        var all = _.sortBy(carriers,'carrier')
        $list.append(Mustache.to_html(carrierSearchTemplate,{all:all, popular:popular, query:query}))
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
    // BCBS
    ///////////////////////////////////////////
    convertStepsToBCBS = function () {
        $('.step-bcbs').removeClass('hidden');
        $('.bcbs-container').removeClass('hidden');
        $('.picker').addClass('show-bcbs');
        $('.steps').addClass('show-bcbs');
        swapPlanText();
    }

    swapPlanText = function() {
        var currentText = $('.step-plan').text();
        var altText = $('.step-plan').data('alt-text');
        $('.step-plan').data('alt-text',currentText);
        $('.step-plan').text(altText);
    }

    convertStepsToDefault = function () {
        $('.step-bcbs').addClass('hidden');
        $('.bcbs-container').addClass('hidden');
        $('.picker').removeClass('show-bcbs');
        $('.steps').removeClass('show-bcbs');
        swapPlanText();
    }

    moveToBCBS = function() {        
        steps.showBCBS();

        search.setPlaceholder(STRINGS.PLACEHOLDER.BCBS);
        
        lists.showList('bcbs');

        currentState = 'bcbs';
    }

    renderBCBS = function(carriers) {
        console.log(carriers);
        var popular = _.sortBy(carriers,'requests').reverse().slice(0,5);
        popular = _.sortBy(popular,'carrier');
        var all = _.sortBy(carriers,'carrier')
        $('.bcbs-container .browse-list')
            .empty()
            .append(Mustache.to_html(carrierTemplate,{all:all,popular:popular,entityType:'companies'}))

        setBCBSBehavior(); 

        $('.see-all-link').click(function() {
            $('.all-container').toggleClass('hidden');
            $(this).text($('.all-container').hasClass('hidden')? $(this).data('off-text'):$(this).data('on-text'));
        });      
    }

    setBCBS = function( listElement ) {
        selectedBCBS = $(listElement).find('.item').text();
        selectedCarrierID = $(listElement).data('carrier-id');

        $('.bcbs-container .list__item').removeClass('selected');
        $(listElement).addClass('selected')

        var $search = $('.search');
        $('.search')
            .val('')
            .focus();

        $('.step-bcbs').addClass('complete');
        $('.picker').removeClass('complete');
        display.setVisibility(true);
        display.setCarrier(selectedBCBS)
        display.setPlan('')
        selectedPlan = '';

        currentPlans = plansGrouped[selectedBCBS];

        planIndex = lunr(function() {
            this.field('plan')
        });

        currentPlans.forEach(function(i) {
            planIndex.add(i);
        });

        renderPlans(currentPlans);

        moveToPlan();
    }

    setBCBSBehavior = function(highlightID) {
        $('.bcbs-container li')
            .hover(function() {
                $('.bcbs-container li').removeClass('highlight');
                $(this).addClass('highlight')
            })
            .click(function(){
                setBCBS(this);
            });

        if (highlightID === undefined) {
            $('.bcbs-container li').first().addClass('highlight');
        } else {
            $('.bcbs-container li[data-bcbs-id="'+ highlightID +'"]').addClass('highlight');
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
        picker.setVisibility(true);
        // if ( $('.search').val().length > 0 ) {
        //     $('.clear').addClass('active');
        // }
    }

    hidePicker = function() {
        $picker = $('.picker');
        picker.setVisibility(false);
        // $('.clear').removeClass('active');

        picker.setIncomplete(!isComplete());

        if ( selectedCarrier != '' && selectedPlan != '' ) {
            $('.search').val(truncate(selectedCarrier + ' - ' + selectedPlan, 30));
        }
    }
    
    
    isComplete = function() {
        return (selectedCarrier != ''  && selectedPlan != '') || payingForSelfOrChoosingLater;
    }
    

    ///////////////////////////////////////////
    // event stuff
    ///////////////////////////////////////////

    //----------------
    // clear button 
    //----------------
    // toggleClear = function () {
    //     if ( $('.search').val().length > 0 ) {
    //         $('.clear').addClass('active');
    //     } else {
    //         $('.clear').removeClass('active');
    //     }
    // }
    
    $('.clear').click(function() {
        // $(this).removeClass('active');
        // $('.search').val('').focus();
        // clearSearchList();
        startOver();
    });


    $('.selected-display__clear').click(function() {
        startOver();
    });



    //----------------
    // search field 
    //----------------
    // $('.search').change(toggleClear);
    // $('.search').keyup(toggleClear);

    $('.search').focus(function() {
        $(this).removeClass('incomplete')
        showPicker();
    });

    clearSearchList = function() {
        $('.' + currentState + '-container .search-list').addClass('hidden');
        $('.' + currentState + '-container .browse-list').removeClass('hidden');
    }

    $('.search').bind('keyup', debounce(function (e) {
        if ([KEY_TAB, KEY_RETURN, KEY_DOWN_ARROW, KEY_UP_ARROW].indexOf(e.keyCode) > -1 ) return;

        if ($(this).val() < 1) {
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
        if ( currentState != 'carrier' ) {
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

    $('.step-bcbs').click(function() {
        if ( currentState != 'bcbs' ) {
            moveToBCBS();
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
                requests: raw.Requests,
                isBCBS: raw.isBCBS
            }
        })

    carriers = _.sortedUniqBy(carriers, 'carrier');

    bcbs = _.filter(carriers, function(i) {
        return i.isBCBS == 1;
    })

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
    
    window.bcbsIndex = lunr(function() {
        this.field('carrier')
    });

    bcbs.forEach(function(i) {
        bcbsIndex.add(i);
    });

    ///////////////////////////////////////////
    // initialize
    ///////////////////////////////////////////
    var initialCarriers = _.filter(carriers,function(i){return i.isBCBS != 1})

    renderCarriers(initialCarriers);
    highlightListItem();
})
