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
    var selectedCarrier, selectedCarrierTruncated, selectedPlan, selectedPlanTruncated, selectedCarrierID = '';
    var currentState = 'carriers';

    
    ///////////////////////////////////////////
    // global functions
    ///////////////////////////////////////////
    setCarrier = function( carrierListElement ) {
        selectedCarrier = $(carrierListElement).find('.item').text();
        selectedCarrierID = $(carrierListElement).data('carrier-id');
        selectedCarrierTruncated = truncate(selectedCarrier,20);
        selectedCarrierTruncated += ' - ';
        $('#search').val(selectedCarrierTruncated);
        $('#search').focus();

        currentState = 'plans';

        renderPlans(plansGrouped[selectedCarrier]);
    }

    setPlan = function( planListElement ) {
        selectedPlan = $(planListElement).find('.item').text();
        selectedPlanTruncated = truncate(selectedPlan,20);        
        $('#search').val(selectedCarrierTruncated + truncate(selectedPlan,20));
    }

    truncate = function( str, numCharacters ) {
        if ( numCharacters === undefined ) numCharacters = 20;
        if ( str.length <= numCharacters ) return str;
        
        pieceLength = Math.floor(numCharacters/2);
        return str.substr(0,pieceLength) + '...' + str.substr(str.length-pieceLength);        
    }

    highlightListItem = function(itemNumber) {
        if ( itemNumber === undefined ) itemNumber = 0;
        $('#main-list-container li').eq(itemNumber).addClass('highlight');
    }

    backToCarrier = function() {
        $('#search').val(selectedCarrier)                
            .get(0).setSelectionRange(0,selectedCarrier.length);
        
        selectedCarrier = '';
        selectedCarrierTruncated = '';

        currentState = 'carriers';
        renderCarriers(carriers, selectedCarrierID);
    }

    renderPlans = function(plans, highlightID) {

        $('#main-list-container')
            .empty()
            .append(Mustache.to_html(planTemplate,{plans:plans}))

        $('#main-list-container li')
            .hover(function() {
                $('#main-list-container li').removeClass('highlight');
                $(this).addClass('highlight')
            })
            .click(function(){
                setPlan(this);
            });

        if (highlightID === undefined) {
            $('#main-list-container li').eq(0).addClass('highlight');
        } else {
            $('#main-list-container li[data-plan-id="'+ highlightID +'"]').addClass('highlight');
        }
    }


    renderCarriers = function (carriers, highlightID) {

        $('#main-list-container')
            .empty()
            .append(Mustache.to_html(carrierTemplate,{carriers:carriers}))

        $('#main-list-container li')
            .hover(function() {
                $('#main-list-container li').removeClass('highlight');
                $(this).addClass('highlight')
            })
            .click(function(){
                setCarrier(this);
            });

        if (highlightID === undefined) {
            $('#main-list-container li[data-carrier-id="'+ highlightID +'"]').addClass('highlight');
        } else {
            $('#main-list-container li[data-carrier-id="'+ highlightID +'"]').addClass('highlight');
        }
    }



    ///////////////////////////////////////////
    // local functions
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

    var logSelection = function (field) {
        var selectedText = $(field).val().substring(field.selectionStart, field.selectionEnd)
        console.log(field.selectionStart + '-' + field.selectionEnd + ': ' + selectedText)
    }

    var isPrintableKey = function (keyCode) {
        return
            (keyCode > 47 && keyCode < 58)   || // number keys
            keyCode == 32                    || // spacebar
            (keyCode > 64 && keyCode < 91)   || // letter keys
            (keyCode > 95 && keyCode < 112)  || // numpad keys
            (keyCode > 185 && keyCode < 193) || // ;=,-./` (in order)
            (keyCode > 218 && keyCode < 223);   // [\]' (in order)
    }

    ///////////////////////////////////////////
    // event stuff
    ///////////////////////////////////////////

    $('#search').keyup(function(e) {
        if (e.keyCode === KEY_LEFT_ARROW || e.keyCode == KEY_RIGHT_ARROW || e.keyCode == KEY_DELETE ) {
            logSelection(this);
        }
    });

    $('#search').mouseup(function() {
        var truncatedLength = selectedCarrierTruncated.length;
        if (this.selectionStart < truncatedLength && this.selectionEnd > truncatedLength ) {
            this.setSelectionRange(0,this.selectionEnd);
        }
        else if ( this.selectionStart < truncatedLength && this.selectionEnd <= truncatedLength ) {
            this.setSelectionRange(0,truncatedLength);
        }

    });

    document.onkeydown = function(e) {
        // console.log(e.keyCode)


        if (e.keyCode == KEY_DOWN_ARROW ) {
            var $selected = $('#main-list-container .highlight');
            if ( $selected.next().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.next().addClass('highlight');
            }
            // return false;
        }

        if (e.keyCode == KEY_UP_ARROW ) { 
            var $selected = $('#main-list-container .highlight');
            if ( $selected.prev().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.prev().addClass('highlight');
            }
        }

        if (e.keyCode == KEY_TAB || e.keyCode == KEY_RETURN ) {
            var $highlightedItem = $('#main-list-container .highlight')
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

    $('#search').keydown(function(e) {
        if (e.keyCode == KEY_DELETE ||  isPrintableKey( e.keyCode ) ) {
            if (this.selectionStart <= selectedCarrierTruncated.length ) {
                backToCarrier();
                return false;
            }
        }
    });

    

    ///////////////////////////////////////////
    // initialize
    ///////////////////////////////////////////

    renderCarriers(carriers);
    window.highlightListItem();
})
