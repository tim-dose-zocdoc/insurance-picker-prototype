const KEY_LEFT_ARROW = 37;
const KEY_RIGHT_ARROW = 39;
const KEY_UP_ARROW = 38;
const KEY_DOWN_ARROW = 40;
const KEY_RETURN = 13;
const KEY_TAB = 9;
const KEY_SPACE = 32;
const KEY_DELETE = 8;

const STRINGS = {
    PLACEHOLDER: {
        CARRIER: 'insurance carrier and plan',
        BCBS:    'insurance carrier',
        PLAN:    'insurance plan'
    }
}

require.config({
    paths:{'text':'/lib/text'}
});

require([
    '/lib/jquery.js',
    '/lib/lodash.js',
    '/lib/mustache.js',
    '/lib/lunr.js',

    'text!templates/carrier-initial.mustache',
    'text!templates/carrier-search.mustache',

    'text!templates/plan-initial.mustache',
    'text!templates/plan-search.mustache',

    'text!templates/no-results.mustache',

    'text!data/insurance_data.json',
    'text!data/carriers.json'
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
            if ( $('.picker').hasClass('clean') ) return; // don't mark incomplete if the picker has never been opened
            $('.picker').toggleClass('incomplete', incomplete);
        },
        setVisibility: function(makeVisible) {
            if ( makeVisible === undefined ) makeVisible = true;
            $('.picker').toggleClass('active', makeVisible);
        },
        dirty: function() {
            $('.picker').removeClass('clean');
        },
        isComplete: function() {
            return $('.picker').hasClass('complete');
        },
        focusOnCompleteLink: function() {
            $('.completed-display').addClass('active')
            console.log('focus pocus!')
        }
    }

    search = {
        setComplete: function(complete) {
            if ( complete === undefined ) complete = true;
            $('.insurance-field-wrapper').toggleClass('complete', complete);
            $('.insurance-field').attr('readonly',complete);
        },
        setPlaceholder: function(text) {
            $('.insurance-field').attr('placeholder',text)
        },
        setValue: function(value) {
            $('.insurance-field').val(value);
        },
        selectAll: function() {
            $('.insurance-field').focus().get(0).setSelectionRange(0,1000)
        },
        clear: function () {
            $('.insurance-field').focus().val('')
        }
    }

    completedDisplay = {
        setCarrier: function(value) {
            $('.completed-display__carrier').text(value);
        },

        setPlan: function(value) {
            $('.completed-display__plan').text(value);
        },
        setReengaged: function(reengaged) {
            if ( reengaged === undefined ) reengaged = true;
            console.log('setReengaged: ' + reengaged );
            $('.completed-display').toggleClass('reengaged', reengaged);
        },
        setActive: function(active) {
            if ( active === undefined ) active = true;
            $('.completed-display').toggleClass('active', active);
        }
    }

    display = {
        setCarrier: function(value) {
            $('.selected-display__carrier').text(value);
            completedDisplay.setCarrier(value);
        },

        setPlan: function(value) {
            $('.selected-display__plan').text(value);
            console.log(value);
            completedDisplay.setPlan(value);
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
        },
        convertToBCBS: function () {
            $('.step-bcbs').removeClass('hidden');
            $('.bcbs-container').removeClass('hidden');
            $('.picker').addClass('show-bcbs');
            $('.steps').addClass('show-bcbs');
            var planStepText = $('.step-plan').text();
            $('.step-plan').text(planStepText.replace('2', '3'));
        },

        convertToDefault: function () {
            $('.step-bcbs').addClass('hidden');
            $('.bcbs-container').addClass('hidden');
            $('.picker').removeClass('show-bcbs');
            $('.steps').removeClass('show-bcbs');
            var planStepText = $('.step-plan').text();
            $('.step-plan').text(planStepText.replace('3', '2'));
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
        },
        highlightNext: function() {
            var $highlighted = $('.'+currentState+'-container .highlight').eq(0);
            var $listItems = $('.'+currentState+'-container .list__item:visible');
            var position = $listItems.index($highlighted);
            if ( position < $listItems.length ) {
                $highlighted.removeClass('highlight');
                $listItems.eq(position+1).addClass('highlight');
            }
        },
        highlightPrevious: function() {
            var $highlighted = $('.'+currentState+'-container .highlight').eq(0);
            var $listItems = $('.'+currentState+'-container .list__item:visible');
            var position = $listItems.index($highlighted);
            if ( position > 0 ) {
                $highlighted.removeClass('highlight');
                $listItems.eq(position-1).addClass('highlight');
            }
        },
        setInteractions: function(section, highlightID) {
            $('.'+section+'-container li')
                .hover(function() {
                    $('.'+section+'-container li').removeClass('highlight');
                    $(this).addClass('highlight')
                })
                .click(function(){
                    var functionName = 'set'+section.charAt(0).toUpperCase() + section.slice(1); // figure out the name of the function to call
                    window[functionName](this); // call that function with itself as an argument
                                                // ultimately the equivalent of doing setPlan(this) or setCarrier(this);
                });

            if (highlightID === undefined) {
                $('.'+section+'-container li').eq(0).addClass('highlight');
            } else {
                $('.'+section+'-container li[data-'+section+'-id="'+ highlightID +'"]').addClass('highlight');
            }
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

        completedDisplay.setReengaged(false);
        completedDisplay.setActive(false);

        search.setValue('');
        search.setComplete(false);
        search.setPlaceholder(STRINGS.PLACEHOLDER.CARRIER);
    }

    reengageCompletedDisplay = function () {
        if ( picker.isComplete() == false ) return;
        completedDisplay.setReengaged();
        search.setComplete(false);
        search.clear();
        lists.setInteractions('completed');
    }

    setCarrier = function( carrierListElement ) {
        selectedCarrier = $(carrierListElement).find('.item').text();
        selectedCarrierID = $(carrierListElement).data('carrier-id');

        steps.setComplete('carrier')
        $('.picker').removeClass('complete');


        if ( selectedCarrierID == -1 ) {
            steps.convertToBCBS();
            renderBCBS(bcbs);
            moveToBCBS();
        } else if ( selectedCarrierID == -2 ) {
            chooseLater();
        } else if ( selectedCarrierID == -3 ) {
            payingForMyself();
        } else {
            steps.convertToDefault();
            setCarrierDefault(carrierListElement);
        }

    }

    setCarrierDefault = function (carrierListElement) {
        $('.list__item').removeClass('selected');
        $(carrierListElement).addClass('selected')

        var $search = $('.insurance-field');
        $('.insurance-field')
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
        display.setPlan(selectedPlan);
        $('.insurance-field').blur();

        currentState = 'completed';
        hidePicker();
    }

    clearPlan = function() {
        selectedPlan = '';
        display.setPlan('')
        steps.setEnabled('plan', false );
        picker.setComplete(false);
        moveToCarrier();
    }

    moveToPlan = function() {
        $('.step').removeClass('active');
        steps.setEnabled('plan');
        steps.setActive('plan');

        // search.setPlaceholder(STRINGS.PLACEHOLDER.PLAN)

        lists.showList('plan');

        currentState = 'plan';
    }

    moveToCarrier = function() {
        steps.setActive('carrier');

        // search.setPlaceholder(STRINGS.PLACEHOLDER.CARRIER);

        lists.showList('carrier');

        currentState = 'carrier';
    }


    ///////////////////////////////////////////
    // completed state
    ///////////////////////////////////////////

    setCompleted = function(listElement) {
        console.log('setCompleted(' + listElement)
    }

    ///////////////////////////////////////////
    // not using insurance 
    ///////////////////////////////////////////

    payingForMyself = function () {
        $('.insurance-field').val("I'm paying for myself")
        payingForSelfOrChoosingLater = true;
        hidePicker();
    }

    chooseLater = function () {
        $('.insurance-field').val("I'll choose my insurance later")
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


        // setPlanBehavior(highlightID);
        lists.setInteractions('plan', highlightID);
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
        lists.setInteractions('plan');
    }




    renderCarriers = function (carriers, highlightID, mode) {

        var popular = _.sortBy(carriers,'requests').reverse().slice(0,5);
        popular = _.sortBy(popular,'carrier');
        var all = _.sortBy(carriers,'carrier')
        $('.carrier-container .browse-list')
            .empty()
            .append(Mustache.to_html(carrierTemplate,{all:all,popular:popular,alternates:true,entityType:'carriers'}))

        lists.setInteractions('carrier', highlightID)

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
        lists.setInteractions('carrier')
    }

    ///////////////////////////////////////////
    // BCBS
    ///////////////////////////////////////////

    moveToBCBS = function() {        
        steps.showBCBS();

        // search.setPlaceholder(STRINGS.PLACEHOLDER.BCBS);
        
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
            .append(Mustache.to_html(carrierTemplate,{all:all,popular:popular,entityType:'carriers'}))

        lists.setInteractions('bcbs')

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

        var $search = $('.insurance-field');
        $('.insurance-field')
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
        picker.dirty();
        picker.setVisibility(true);
        // if ( $('.insurance-field').val().length > 0 ) {
        //     $('.clear').addClass('active');
        // }
    }

    hidePicker = function() {
        $picker = $('.picker');
        picker.setVisibility(false);
        $('.completed-display').removeClass('active');

        picker.setIncomplete(!isComplete());

        if ( selectedCarrier != '' && selectedPlan != '' ) {
            $('.insurance-field').val(truncate(selectedCarrier + ' - ' + selectedPlan, 30));
        }
    }
    
    
    isComplete = function() {
        return (selectedCarrier != ''  && selectedPlan != '') || payingForSelfOrChoosingLater;
    }
    

    ///////////////////////////////////////////
    // event stuff
    ///////////////////////////////////////////


    //----------------
    // completed display 
    //----------------


    $('.completed-display__clear').click(function() {
        startOver();
    });

    $('.completed-display__clear--mobile').click(function() {
        startOver();
    });

    $('.completed-display__clear').keypress(function(e) {
        if (e.keyCode == KEY_SPACE || e.keyCode == KEY_RETURN ) {
            startOver();
            return false;
        }
    })

    $('.completed-display').click(function(){
        console.log('.completed-display clicked')
        reengageCompletedDisplay();
    });

    //----------------
    // clear buttons
    //----------------

    // toggleClear = function () {
    //     if ( $('.insurance-field').val().length > 0 ) {
    //         $('.clear').addClass('active');
    //     } else {
    //         $('.clear').removeClass('active');
    //     }
    // }
    
    $('.clear').click(function() {
        // $(this).removeClass('active');
        // $('.insurance-field').val('').focus();
        // clearSearchList();
        startOver();
    });


    $('.selected-display__clear').click(function() {
        startOver();
    });


    $('.selected-display__clear').click(function() {
        startOver();
    });

    $('.selected-display i').click(function() {
        var target = $(this).data('target');
        if (target == 'carrier') {
            startOver();
        } else {
            clearPlan();
        }
    });

    //----------------
    // search field 
    //----------------
    // $('.insurance-field').change(toggleClear);
    // $('.insurance-field').keyup(toggleClear);

    $('.insurance-field').focus(function() {
        if ( picker.isComplete() ) {
            reengageCompletedDisplay();
        } else {
            picker.setIncomplete(false);
            showPicker();
        }
        
    });

    clearSearchList = function() {
        $('.' + currentState + '-container .search-list').addClass('hidden');
        $('.' + currentState + '-container .browse-list').removeClass('hidden');
    }

    $('.insurance-field').bind('keyup', debounce(function (e) {
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
            lists.highlightNext();
        }

        if (e.keyCode == KEY_UP_ARROW ) { 
            lists.highlightPrevious();
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
            if (currentState == 'bcbs') {
                setBCBS($('.bcbs-container .highlight').eq(0));
                return;
            }

            if (currentState == 'completed') {
                setCompleted($('.completed-container .highlight').eq(0));
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

    $('.picker__close').click(function(){
        hidePicker();
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
