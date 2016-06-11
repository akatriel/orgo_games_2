class ApplicationController < ActionController::Base
 	protect_from_forgery with: :null_session
  	def random_alkane
		alkanes = ['methane', 'ethane', 'propane', 'butane', 'pentane', 'hexane', 'heptane', 'octane', 'nonane', 'decane']
		@alkane = alkanes[rand(10)]
		@alkane
	end
	helper_method :random_alkane

	def random_alkene
		#A hash contains keys of filenames, the values contain arrays of acceptable names.
		alkenes = {ethene: ['ethene', 'ethylene'], 
			propene: ['propene', 'prop-1-ene'],
			but1ene: ['but-1-ene'],
			ebut2ene: ['e-but-2-ene'],
			zbut2ene: ['z-but-2-ene'],
			pent1ene: ['pent-1-ene'],
			epent2ene: ['e-pent-2-ene'],
			zpent2ene: ['z-pent-2-ene'],
			hex1ene: ['hex-1-ene'],
			ehex2ene: ['e-hex-2-ene'],
			zhex2ene: ['z-hex-2-ene'],
			ehex3ene: ['e-hex-3-ene'],
			zhex3ene: ['z-hex-3-ene'],
			hept1ene: ['hept-1-ene'],
			ehept2ene: ['e-hept-2-ene'],
			zhept2ene: ['z-hept-2-ene'],
			ehept3ene: ['e-hept-3-ene'],
			zhept3ene: ['z-hept-3-ene'],
			oct1ene: ['oct-1-ene'],
			eoct2ene: ['e-oct-2-ene'],
			zoct2ene: ['z-oct-2-ene'],
			zoct3ene: ['z-oct-3-ene'],
			eoct3ene: ['e-oct-3-ene'],
			zoct4ene: ['z-oct-4-ene'],
			eoct4ene: ['e-oct-4-ene']}
		keys = alkenes.keys
		randKey = keys[rand(keys.length)]
		@alkeneInfo = [randKey, alkenes[randKey]]
		#need to return key to fetch image, but also value to be set as a data attribute and parse the input
	end
	helper_method :random_alkene

	def fetch_random_newman 
		projections = [['1_back', '1_front', 300, '6.10'], ['2_back', '2_front', 300, '6.11'], ['3_back', '3_front', 180, '6.12'], ['4_back', '4_front', 180, '6.13'], ['5_back', '5_front', 180, '6.14']];
		@newmanInfo = projections[rand(projections.length)]
		#returns newman projection back, front, expected angle, skeleton formula
	end
	helper_method :fetch_random_newman
end
