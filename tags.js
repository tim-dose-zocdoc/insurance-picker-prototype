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
    ///////////////////////////////////////////
    // global functions
    ///////////////////////////////////////////
    var currentState = 'carriers';
    
    setCarrier = function( carrierListElement ) {
        var carrierName = $(carrierListElement).find('.item').text();
        var truncated = truncate(carrierName,20);
        truncated += ' - ';
        $('#search').val(truncated);
        $('#carrier-truncated').val(truncated);
        $('#carrier').val(carrierName);
        $('#search').focus();

        currentState = 'plans';

        renderPlans();
    }

    setPlan = function( planListElement ) {
        var planName = $(planListElement).find('.item').text();
        var currentStr = $('#search').val();
        $('#search').val(currentStr + truncate(planName,20));
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
        var carrier =  $('#carrier').val()
        $('#carrier').val('');
        $('#carrier-truncated').val('');
        $('#search').val(carrier)                
            .get(0).setSelectionRange(0,carrier.length);

        currentState = 'carriers';
        renderCarriers(carriers);
    }

    renderPlans = function() {
        var plans = [
            { id: 1, carrier: 'Carrier', carrierDisplay: 'Carrier', plan: 'HMO', planDisplay: 'HMO', requests: 10 },
            { id: 2, carrier: 'Carrier', carrierDisplay: 'Carrier', plan: 'PPO', planDisplay: 'PPO', requests: 10 },
            { id: 3, carrier: 'Carrier', carrierDisplay: 'Carrier', plan: 'EPO', planDisplay: 'EPO', requests: 10 }
        ]

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
    }

    renderCarriers = function (carriers) {
        console.log(carriers);
        // carriers.sort();

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
    var carriers = _.keys(plansGrouped).map(function(item){
        return {carrier: item}
    });


    
    var showSelection = function() {
        var truncated = carrierName = $(this).val();
        if ( truncated.length > 20 ) {
            truncated = carrierName.substr(0,5) + '...' + carrierName.substr(carrierName.length-5)
        }
        $('#search').val(truncated);
    };

    var logSelection = function (field) {
        var selectedText = $(field).val().substring(field.selectionStart, field.selectionEnd)
        console.log(field.selectionStart + '-' + field.selectionEnd + ': ' + selectedText)
    }


    ///////////////////////////////////////////
    // event stuff
    ///////////////////////////////////////////
    $('#carrier')
        .change(showSelection)
        .click(showSelection);

    $('#search').keyup(function(e) {
        // console.log(e);
        if (e.keyCode === KEY_LEFT_ARROW || e.keyCode == KEY_RIGHT_ARROW || e.keyCode == KEY_DELETE ) {
            logSelection(this);
        }
    });

    $('#search').mouseup(function() {
        var truncatedLength = $('#carrier-truncated').val().length;
        if (this.selectionStart < truncatedLength && this.selectionEnd > truncatedLength ) {
            this.setSelectionRange(0,this.selectionEnd);
        }
        else if ( this.selectionStart < truncatedLength && this.selectionEnd <= truncatedLength ) {
            this.setSelectionRange(0,truncatedLength);
        }

    });

    $('#search').keydown(function(e) {
        // console.log(e);

        if (e.keyCode == KEY_DOWN_ARROW ) {
            var $selected = $('#main-list-container .highlight');
            if ( $selected.next().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.next().addClass('highlight');
            }
        }

        if (e.keyCode == KEY_UP_ARROW ) { 
            var $selected = $('#main-list-container .highlight');
            if ( $selected.prev().length > 0 ) {
                $selected.removeClass('highlight');
                $selected.prev().addClass('highlight');
            }
        }

        if (e.keyCode == KEY_TAB || e.keyCode == KEY_RETURN ) {
            if (currentState == 'plans') return;
            setCarrier($('#main-list-container .highlight'));
        }

        // if (e.keyCode == KEY_DELETE ) {
            if (this.selectionStart <= $('#carrier-truncated').val().length ) {
                backToCarrier();
                return false;
            }
        // }

        // if (this.selectionStart )
    });

    

    ///////////////////////////////////////////
    // initialize
    ///////////////////////////////////////////

    renderCarriers(carriers);
    window.highlightListItem();
})
