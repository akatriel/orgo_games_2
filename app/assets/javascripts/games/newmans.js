$('.games.newmans').ready(function(){
	console.log('newmans loaded')
	//setup
	$('#modal').modal('show');

	$('#start-button').click(function(){
		start();
	});

	var projections = [['1_back', '1_front', 300, '6.10'], ['2_back', '2_front', 300, '6.11'], ['3_back', '3_front', 180, '6.12'], ['4_back', '4_front', 180, '6.13'], ['5_back', '5_front', 180, '6.14']];

    
	var expectedAngle = $('#front').attr('data-angle');
	expectedAngle = parseInt(expectedAngle);

	var userAngle;

	//replay
	$('#reload').click(function(){
		$.post('/fetch_newman', function(data, status){
			data;
			start();
			buildPropeller();
		});
	});
    // rotation
    function buildPropeller(){
	    $('#back').propeller({
	        inertia: 0, 
	        speed: 0,
	        onDragStop: function(){
	            userAngle = this.angle;
	            console.log("inside callback: ", userAngle);
	            parseAngle();
	        }
	    });
	};    
    function parseAngle(){
        console.log("user: "+ userAngle);
        console.log( "expected: " + expectedAngle);
        if(Math.abs(userAngle - expectedAngle)  < 10){
            console.log('parsed');
           	success();
        }
    };

    function success(){
    	$('#stable').show();
        $('#reload').show();
        setTimeout(function(){
            $('#modal').modal('show');
        }, 4000);
    }

    function start(){
    	$('#modal').modal('hide');
    	$('#start-button').hide();
    	buildPropeller();
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    };
});