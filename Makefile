# Makefile header from https://tech.davis-hansson.com/p/make/
SHELL := bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

STUDENT_DATA := data/aux/2024-01_citizenship.csv 
MAP_DATA := data/50m.topojson data/10m.topojson
RELEASE_FILES := index.html style.css map.js js/leaflet-zoom-show-hide.js $(MAP_DATA)

all: $(MAP_DATA)

data data/aux zip js:
	@[ -d $@ ] || mkdir -p $@

zip/release.zip: $(RELEASE_FILES) | zip
	zip $@ $(RELEASE_FILES)

js/%: | js
	cp $< $@

js/leaflet-zoom-show-hide.js: node_modules/leaflet.zoomshowhide/dist/leaflet-zoom-show-hide.js

node_modules/%:
	npm install

data/aux/%.csv: data/%.xlsx data/is_czso_join.csv | data/aux
	@csvjoin --left --columns citizenship,is_text \
		<(cat \
			<(echo "citizenship,all,phd") \
			<(csvjoin --outer --columns Občanství,Občanství \
				<(in2csv --sheet=PřF_všichni $<) \
				<(in2csv --sheet=PřF_PhD $<) \
			| csvcut --columns "Občanství,Počet studentů,Počet PhD studentů" \
			| tail +2) \
		| csvgrep --columns citizenship --invert-match --regex ^Celkem$$) \
		data/is_czso_join.csv \
	| csvcut -c ISO_A2,all,phd \
	> $@

data/50m.topojson: data/aux/50m.geojson
	@geo2topo -q 1e4 countries=$< |\
	toposimplify -p 1e7 \
	> $@

data/10m.topojson: data/aux/10m.geojson
	@geo2topo -q 1e5 countries=$< |\
	toposimplify -p 1e6 \
	> $@

MERGE_FILES = ""

data/aux/%.geojson: data/aux/ne_%_admin_0_map_units.shp data/iso_norm_names.csv $(STUDENT_DATA)
	mapshaper $< $(MERGE_FILES) combine-files -merge-layers \
		-dissolve fields=ISO_A2_EH where='ISO_A2_EH != -99' copy-fields=NAME \
		-proj '+proj=wintri +lon_0=0 +lat_1=50.467 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs' \
		-simplify dp interval=1 \
		-join data/iso_norm_names.csv keys=ISO_A2_EH,ISO_A2_EH \
		-each 'NAME = NAME_NORM || NAME' \
		-join $(STUDENT_DATA) keys=ISO_A2_EH,ISO_A2 \
		-filter-fields ISO_A2_EH,NAME,all,phd \
		-rename-fields ISO_A2=ISO_A2_EH \
		-o $@

data/aux/10m.geojson: MERGE_FILES = data/10m_artefact_fill.geojson

data/aux/ne_%_admin_0_map_units.shp: data/aux/ne_%_admin_0_map_units.zip | data/aux
	@unzip -qj $< -d $|
	@touch $@

data/aux/ne_%_admin_0_map_units.zip: | data/aux
	@wget -q --show-progress -O $@ \
		https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/$*/cultural/ne_$*_admin_0_map_units.zip || \
	wget -q --show-progress -O $@ \
		https://naciscdn.org/naturalearth/$*/cultural/ne_$*_admin_0_map_units.zip

clean:
	rm -rf $(MAP_DATA) data/aux/{10,50}m.geojson

clean-all:
	rm -rf $(MAP_DATA) data/aux

.SECONDARY:
.PHONY: help clean clean-all

# Makefile self documentation from https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help: ## Print this help
> @grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
