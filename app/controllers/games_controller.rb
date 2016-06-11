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
		alkeneInfo = random_alkene
		@alkenePictureName = alkeneInfo[0]
		alkeneMoleculeNames = alkeneInfo[1]
		if alkeneMoleculeNames.length > 1  
			@name1, @name2 = alkeneMoleculeNames[0].downcase, alkeneMoleculeNames[1].downcase
		else
			@name1 = alkeneMoleculeNames[0].downcase
		end
	end
	def fetch_alkene
		alkeneInfo = random_alkene
		@alkenePictureName = alkeneInfo[0]
		alkeneMoleculeNames = alkeneInfo[1]
		if alkeneMoleculeNames.length > 1  
			@name1, @name2 = alkeneMoleculeNames[0].downcase, alkeneMoleculeNames[1].downcase
		else
			@name1 = alkeneMoleculeNames[0].downcase
		end

		respond_to do |format|
			format.js
		end	
	end
	def chairs
	end
	def newmans
		@newmanInfo = fetch_random_newman
	end
	def fetch_newman
		@newmanInfo = fetch_random_newman

		respond_to do |format|
			format.js
		end
	end
end
