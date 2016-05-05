class ApplicationController < ActionController::Base
 	protect_from_forgery with: :null_session
  	def random_alkane
		alkanes = ['methane', 'ethane', 'propane', 'butane', 'pentane', 'hexane', 'heptane', 'octane', 'nonane', 'decane']
		@alkane = alkanes[rand(10)]
		@alkane
	end
	helper_method :random_alkane
end
