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
    var selectedCarrierTruncated
    var selectedPlan = ''
    var selectedPlanTruncated = ''
    var selectedCarrierID = '';
    var currentState = 'carriers';

    
    ///////////////////////////////////////////
    // setting & moving
    ///////////////////////////////////////////
    setCarrier = function( carrierListElement ) {
        selectedCarrier = $(carrierListElement).find('.item').text();
        selectedCarrierID = $(carrierListElement).data('carrier-id');
        selectedCarrierTruncated = truncate(selectedCarrier,14);

        var $search = $('#search');

        $('#search')
            .data('selectedCarrier', selectedCarrier)
            .val('')
            .focus();

        currentState = 'plans';

        $('.step-carrier').addClass('complete')
        $('.carrier-display').text(selectedCarrier);
        $('.plan-display').text('');

        renderPlans(plansGrouped[selectedCarrier]);

        moveToPlan();
    }

    setPlan = function( planListElement ) {
        selectedPlan = $(planListElement).find('.item').text();
        selectedPlanTruncated = truncate(selectedPlan,20);        
        $('#search')
            .val(selectedPlan)
            .focus()
            .get(0).setSelectionRange(selectedPlan.length, selectedPlan.length)

        $('.step-plan').addClass('complete');
        $('.search-wrapper').addClass('complete');
        $('.plan-display').text(selectedPlan);
    }

    moveToPlan = function() {
        $('.step').removeClass('active');
        $('.step-plan').addClass('active').removeClass('disabled');

        $('#search').attr('placeholder','search plans')

        $('.frame').addClass('show-plan');

        currentState = 'plans';
    }

    moveToCarrier = function() {
        $('.step').removeClass('active');
        $('.step-carrier').addClass('active');

        $('#search').attr('placeholder','search carriers and plans')

        $('.frame').removeClass('show-plan');

        currentState = 'carriers';
    }


    ///////////////////////////////////////////
    // render lists
    ///////////////////////////////////////////

    renderPlans = function(plans, highlightID) {

        $('#plan-list-container')
            .empty()
            .append(Mustache.to_html(planTemplate,{plans:plans}))

        $('#plan-list-container li')
            .hover(function() {
                $('#plan-list-container li').removeClass('highlight');
                $(this).addClass('highlight')
            })
            .click(function(){
                setPlan(this);
            });

        if (highlightID === undefined) {
            $('#plan-list-container li').eq(0).addClass('highlight');
        } else {
            $('#plan-list-container li[data-plan-id="'+ highlightID +'"]').addClass('highlight');
        }
    }


    renderCarriers = function (carriers, highlightID) {

        $('#carrier-list-container')
            .empty()
            .append(Mustache.to_html(carrierTemplate,{carriers:carriers}))

        $('#carrier-list-container li')
            .hover(function() {
                $('#carrier-list-container li').removeClass('highlight');
                $(this).addClass('highlight')
            })
            .click(function(){
                setCarrier(this);
            });

        if (highlightID === undefined) {
            $('#carrier-list-container li[data-carrier-id="'+ highlightID +'"]').addClass('highlight');
        } else {
            $('#carrier-list-container li[data-carrier-id="'+ highlightID +'"]').addClass('highlight');
        }
    }




    

    truncate = function( str, numCharacters ) {
        if ( numCharacters === undefined ) numCharacters = 20;
        if ( str.length <= numCharacters ) return str;
        
        pieceLength = Math.floor(numCharacters/2);
        return str.substr(0,pieceLength) + '...' + str.substr(str.length-pieceLength);        
    }

    highlightListItem = function(itemNumber) {
        if ( itemNumber === undefined ) itemNumber = 0;
        $('#carrier-list-container li').eq(itemNumber).addClass('highlight');
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

    $('#search').mouseup(function() {
        var truncatedLength = selectedCarrierTruncated.length;
        if ( this.selectionStart >= truncatedLength && this.selectionEnd >= truncatedLength ) return;

        this.select();
    });

    document.onkeydown = function(e) {
        // console.log(e.keyCode)


        if (e.keyCode == KEY_DOWN_ARROW ) {
            var $selected = $('#carrier-list-container .highlight');
            if ( $selected.next().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.next().addClass('highlight');
            }
            // return false;
        }

        if (e.keyCode == KEY_UP_ARROW ) { 
            var $selected = $('#carrier-list-container .highlight');
            if ( $selected.prev().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.prev().addClass('highlight');
            }
        }

        if (e.keyCode == KEY_TAB || e.keyCode == KEY_RETURN ) {
            var $highlightedItem = $('#carrier-list-container .highlight')
            if (currentState == 'plans') {
                setPlan($highlightedItem);
                return;
            }
            if (currentState == 'carriers') {
                setCarrier($highlightedItem);
                return;
            }
        }
    }


    toggleClear = function () {
        if ( $('#search').val().length > 0 ) {
            $('.clear').addClass('active');
        } else {
            $('.clear').removeClass('active');
        }
    }
    $('#search').change(toggleClear);
    $('#search').keyup(toggleClear);

    $('#search').focus(function() {
        $(this).parents('.picker').addClass('active');
    });

    // $('#search').blur(function() {
    //     if ( $(this).val().length > 1 && ( selectedCarrier == '' || selectedPlan == '' ) )   {
    //         $(this).addClass('incomplete');
    //     }

    //     if ( $(this).val().length == 0 && selectedCarrier != '' && selectedPlan == '' ) {
    //         $(this)
    //             .val('choose plan')
    //             .addClass('prompt')
    //             .data('status', 'needs-plan')
    //     }
    // });

    $('.step-carrier').click(function() {
        if ( currentState == 'plans' ) {
            moveToCarrier();
            return false;
        }
    });

    $('.step-plan').click(function() {
        if ( currentState != 'plans' ) {
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
