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
    'text!templates/carrier-list.mustache',
    'text!templates/plan-list.mustache',
    'text!insurance_data.json'
], function (jquery, _, Mustache, carrierTemplate, planTemplate, insuranceData ) {
    var selectedCarrier = ''
    var selectedPlan = ''
    var selectedCarrierID = '';
    var currentState = 'carrier';

    
    ///////////////////////////////////////////
    // setting & moving
    ///////////////////////////////////////////
    setCarrier = function( carrierListElement ) {
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

        renderPlans(plansGrouped[selectedCarrier]);

        moveToPlan();
    }

    setPlan = function( planListElement ) {
        selectedPlan = $(planListElement).find('.item').text();

        $('.plan-list-container .list__item').removeClass('selected');
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

        $('.search').attr('placeholder','search "' + truncate(selectedCarrier,16) + '" plans')
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

    renderPlans = function(plans, highlightID) {

        $('.plan-list-container')
            .empty()
            .append(Mustache.to_html(planTemplate,{plans:plans}))

        $('.plan-list-container li')
            .hover(function() {
                $('.plan-list-container li').removeClass('highlight');
                $(this).addClass('highlight')
            })
            .click(function(){
                setPlan(this);
            });

        if (highlightID === undefined) {
            $('.plan-list-container li').eq(0).addClass('highlight');
        } else {
            $('.plan-list-container li[data-plan-id="'+ highlightID +'"]').addClass('highlight');
        }
    }


    renderCarriers = function (carriers, highlightID) {

        $('.carrier-list-container')
            .empty()
            .append(Mustache.to_html(carrierTemplate,{carriers:carriers}))

        $('.carrier-list-container li')
            .hover(function() {
                $('.carrier-list-container li').removeClass('highlight');
                $(this).addClass('highlight')
            })
            .click(function(){
                setCarrier(this);
            });

        if (highlightID === undefined) {
            $('.carrier-list-container li[data-carrier-id="'+ highlightID +'"]').addClass('highlight');
        } else {
            $('.carrier-list-container li[data-carrier-id="'+ highlightID +'"]').addClass('highlight');
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
        $('.carrier-list-container li').eq(itemNumber).addClass('highlight');
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

    var plansGrouped = _.groupBy(plans, 'carrier');
    var carriers = _.keys(plansGrouped).map(function(item, index){
        return {id: index, carrier: item}
    });

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


    //----------------
    // picker 
    //----------------
    $('.picker').get(0).onkeydown = function(e) {
        if (e.keyCode == KEY_DOWN_ARROW ) {
            var $selected = $('.'+currentState+'-list-container .highlight');
            if ( $selected.next().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.next().addClass('highlight');
            }
        }

        if (e.keyCode == KEY_UP_ARROW ) { 
            var $selected = $('.'+currentState+'-list-container .highlight');
            if ( $selected.prev().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.prev().addClass('highlight');
            }
        }

        if (e.keyCode == KEY_TAB || e.keyCode == KEY_RETURN ) {
            if (currentState == 'plan') {
                setPlan($('.plan-list-container .highlight'));
                return;
            }
            if (currentState == 'carrier') {
                setCarrier($('.carrier-list-container .highlight'));
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
    // initialize
    ///////////////////////////////////////////

    renderCarriers(carriers);
    highlightListItem();
})
