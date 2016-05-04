class GamesController < ApplicationController
	def alkanes
		alkanes = ['methane', 'ethane', 'propane', 'butane', 'pentane', 'hexane', 'heptane', 'octane', 'nonane', 'decane']
		@alkane = alkanes[rand(10)]
		@alkane unless nil
		respond_to do |format|
			format.html
			format.js
		end
	end
	def alkenes
	end
	def chairs
	end
	def newmans
	end
end
