import pandas as pd


def get_word_cloud_data(country_code):
    df = pd.read_csv('data/startups.csv')
    df = df[df['country_code'] == country_code]
    category = pd.DataFrame(df.category_group_list.str.split(',', expand=True).stack())
    categories_to_drop = ['Software', 'Mobile', 'Apps', 'Internet Services']

    category = pd.DataFrame(category)
    for c in categories_to_drop:
        category = category[category[0] != c]
    category = pd.DataFrame(category[0].value_counts())
    category = category.reset_index()
    category = category.rename(columns={'index': 'text', 0: 'frequency'})

    # Make the distribution of the frequency to be the same
    multiplier = 300
    category['frequency'] = (category['frequency'] / float(category['frequency'].sum())) * multiplier

    return category.to_json(orient='records')
