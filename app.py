from flask import Flask, render_template, request
import startup_visualizer
import os
import json
import pandas as pd


app = Flask(__name__)


@app.route('/country_codes')
def get_all_country_codes():
    return


@app.route('/word_cloud')
def get_word_cloud_data():
    country_code = request.args.get('country')
    return startup_visualizer.get_word_cloud_data(country_code)


@app.route('/most_popular_companies')
def get_most_popular_companies_by_category():
    category = request.args.get('category')
    country_code = request.args.get('country')
    return startup_visualizer.get_most_popular_companies(country_code, category)


@app.route('/par_coords')
def par_coords():
    country_code = request.args.get('country')
    return startup_visualizer.get_data(country_code)


@app.route('/worldmap')
def worldmap():
    with open('data/worldmap.json') as json_data:
        d = json.load(json_data)
        d = json.dumps(d)
    return d


@app.route('/countrycode')
def countrycode():
    df = pd.read_csv('data/countrycode.csv')
    return df.to_json(orient='records')

@app.route('/countrycenter')
def countrycenter():
    df = pd.read_csv('data/countrycenter.tsv',delimiter='\t',encoding='utf-8')
    return df.to_json(orient='records')

@app.route('/demoflow')
def demoflow():
    df = pd.read_csv('data/demoflow.csv')
    return df.to_json(orient='records')


@app.route('/demototal')
def demototal():
    df = pd.read_csv('data/demototal.csv')
    return df.to_json(orient='records')


@app.route('/getflow')
def getflow():
    # Get investment flow from every country pairs from the dataset
    return startup_visualizer.getflow()


@app.route('/gettotal')
def gettotal():
    # Get total net investment for every country, can be negative
    return startup_visualizer.gettotal()


@app.route('/')
def index():
    return render_template("index.html")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='localhost', port=port)
