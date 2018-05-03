from flask import Flask, render_template, request
import startup_visualizer
import os

app = Flask(__name__)


@app.route("/country_codes")
def get_all_country_codes():
    return


@app.route("/word_cloud")
def get_word_cloud_data():
    country_code = request.args.get('country')
    return startup_visualizer.get_word_cloud_data(country_code)


@app.route("/most_popular_companies")
def get_most_popular_companies_by_category():
    category = request.args.get('category')
    country_code = request.args.get('country')
    return startup_visualizer.get_most_popular_companies(country_code, category)


@app.route("/par_coords")
def par_coords():
    country_code = request.args.get('country')
    return startup_visualizer.get_data(country_code)


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='localhost', port=port)
