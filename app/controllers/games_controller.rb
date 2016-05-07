class GamesController < ApplicationController
	def alkanes
		@alkane = random_alkane
	end	
	def fetch_alkane
		@alkane = random_alkane
		respond_to do |format|
			format.js
		end	
	end
	def alkenes
		@alkene = random_alkene
	end
	def fetch_alkene
		@alkene = random_alkene
		respond_to do |format|
			format.js
		end	
	end
	def chairs
	end
	def newmans
	end
end
