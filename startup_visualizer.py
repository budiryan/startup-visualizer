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


def get_most_popular_companies(country_code, category):
    '''
    :param country_code:
    :param category:
    :return: Get three most popular companies given a country and category
    '''
    startups = pd.read_csv('data/startups.csv')
    startups = startups[startups['country_code'] == country_code]
    startups = startups.set_index('company_uuid')
    startups = startups[['company_name', 'category_group_list']]
    count = startups.groupby([startups.index]).size().rename(columns={0: 'count'})
    categories = pd.DataFrame(startups.drop_duplicates().category_group_list.str.split(',', expand=True).stack())

    # merge companies with count first
    count = pd.DataFrame(count).rename(columns={0: 'count'})
    startups = startups.drop_duplicates()
    final = pd.merge(startups, count, left_index=True, right_index=True)

    # merge final with categories
    final = pd.merge(final, categories, left_index=True, right_index=True)

    final = final.rename(columns={0: 'category'})
    final = final[final['category'] == category]
    print('Most popular companies in this category is: ', list(final.sort_values('count', ascending=False)[:3]['company_name']))
    return final.sort_values('count', ascending=False)[:3].to_json(orient='records')