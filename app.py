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
    print("Country code is: ", country_code)
    return startup_visualizer.get_word_cloud_data(country_code)

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='localhost', port=port)
