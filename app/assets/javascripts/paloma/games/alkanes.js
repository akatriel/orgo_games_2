$('.games alkanes').ready(function(){
	var score = 0;
	var strikes = 0;
	var alkane = ['methane', 'ethane', 'propane', 'butane', 'pentane', 'hexane', 'heptane', 'octane', 'nonane', 'decane'];
	var counter = 20;
	var randy;
	$(document).ready(function(){
		$("#fake-submit").click(function(event){
			event.preventDefault();
			parseInput();
			$('.score').html(score);
			$('.strikes').html(strikes);
		});
		function getRandomInt(min, max) {
			return Math.floor(Math.random() * (max - min)) + min;
		}

		
		function timer(){
			genPic();
			setInterval(function(){
				$('.timer').html(counter.toString());

				if(counter === 0){
					counter = 20;
					strikes++;
					genPic();
					if(strikes == 3){
						gameOver();
					}
				}
				else{
					counter--;
				}
			}, 1000);
		}
		timer();
		
		
		function genPic(){
			randy = getRandomInt(0, alkane.length - 1); 

			$('#model').attr('src', '/images/alkanes/' + alkane[randy] + '.png' );
		}

		function parseInput(){
			var input = $('#chem-input').val().toLowerCase();
			
			if(input == alkane[randy]){
				score += counter;
				counter = 20;
				genPic();
				$('#chem-input').val("");
			}
			else{
				strikes++;
				if(strikes == 3){
					gameOver();
				}
			}
		}

		function gameOver(){
			$('.gameOver').show();	
			setTimeout(function(){location.reload()}, 5000);
		}


		
	});
});