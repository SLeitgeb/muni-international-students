# Makefile header from https://tech.davis-hansson.com/p/make/
SHELL := bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

STUDENT_DATA := data/aux/2024-01_citizenship.csv 
TARGETS := data/50m.topojson data/10m.topojson

all: $(TARGETS)

data data/aux:
	@[ -d $@ ] || mkdir -p $@

data/aux/%.csv: data/%.xlsx data/is_czso_join.csv | data
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
	toposimplify -s 1e-7 \
	> $@

data/10m.topojson: data/aux/10m.geojson
	@geo2topo -q 1e5 countries=$< |\
	toposimplify -s 1e-7 \
	> $@

data/aux/%.geojson: data/aux/ne_%_admin_0_map_units.shp data/iso_norm_names.csv $(STUDENT_DATA)
	@mapshaper $< \
		-dissolve fields=ISO_A2_EH where='ISO_A2_EH != -99' copy-fields=NAME \
		-join data/iso_norm_names.csv keys=ISO_A2_EH,ISO_A2_EH \
		-each 'NAME = NAME_NORM || NAME' \
		-join $(STUDENT_DATA) keys=ISO_A2_EH,ISO_A2 \
		-filter-fields ISO_A2_EH,NAME,all,phd \
		-rename-fields ISO_A2=ISO_A2_EH \
		-o $@

data/aux/ne_%_admin_0_map_units.shp: data/aux/ne_%_admin_0_map_units.zip | data/aux
	@unzip -qj $< -d $|
	@touch $@

data/aux/ne_%_admin_0_map_units.zip: | data/aux
	@wget -q --show-progress -O $@ \
		https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/$*/cultural/ne_$*_admin_0_map_units.zip

clean:
	rm -rf $(TARGETS) data/aux

.SECONDARY:
.PHONY: help

# Makefile self documentation from https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help: ## Print this help
> @grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
