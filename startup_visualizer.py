import pandas as pd
import numpy as np
import gc


def get_data(country_code):
    df = pd.read_csv('data/startups.csv')
    df = df[df['country_code'] == country_code]
    return df.to_json(orient='records')


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
    multiplier = 420
    category['frequency'] = (category['frequency'] / float(category['frequency'].sum())) * multiplier
    # Clip to prevent word cloud which has extra large size
    category['frequency'] = category['frequency'].clip(0, 35)

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
    startups = startups[['company_name', 'category_group_list', 'homepage_url']]
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
    return final.sort_values('count', ascending=False)[:3].to_json(orient='records')


def get_net_investment():
    dtypes = {
        'country_code': 'object',
        'investor_country_code': 'object',
        'raised_amount_usd': 'float64'
    }
    df = pd.read_csv('data/startups.csv', dtype=dtypes, usecols=['country_code', 'investor_country_code', 'raised_amount_usd'])
    df = df[df['country_code'] != df['investor_country_code']]
    group_cols = ['country_code', 'investor_country_code']
    counted = 'raised_amount_usd'
    agg_name = 'net_investment'

    # Groupby country_code and investor_country_code and sum it all up
    gp = df[group_cols+[counted]].groupby(group_cols)[counted].sum().reset_index().rename(columns={counted:agg_name})
    df = df.merge(gp, on=group_cols, how='left')
    df.drop(['raised_amount_usd'], axis=1, inplace=True)
    df.drop_duplicates(group_cols, inplace=True)
    del gp

    gc.collect()

    # substract columns which are just reversed from each other, e.g. (A, B) - (B, A) and then drop the duplicates
    df['check_string'] = df.apply(lambda row: ''.join(sorted([row['country_code'], row['investor_country_code']])), axis=1)
    df['substracted_net'] = (df.groupby('check_string').net_investment.shift(-1)- df.net_investment) * -1
    df.substracted_net.fillna(df.net_investment, inplace=True)

    df.drop_duplicates(['check_string'], inplace=True)
    df = df.reset_index(drop=True)

    return df


def getflow():
    '''
    Rule: Generate all unique combination of investor and destination country with its net investment summed up
    Example: Origin: USA, Destination: IDN, Amount of investment: XXXX USD
    '''
    df = get_net_investment()

    # If the column substacted_net is negative, that means switch the column between investor and the startup
    df['country_code'], df['investor_country_code'] = np.where(df['substracted_net'] < 0,
                                                               [df['investor_country_code'], df['country_code']],
                                                               [df['country_code'], df['investor_country_code']])

    # return the result
    return_d = {'origin': df['investor_country_code'].values, 'destination': df['country_code'].values,
                'amount': np.absolute(df['substracted_net'].values)}
    return_df = pd.DataFrame(return_d)

    # take logarithm of the amount, otherwise the browser will go crazy
    # return_df['amount']  = np.log10((return_df['amount'] / 50) + 0.001)
    return_df['amount'] /= 1e8

    return return_df.to_json(orient='records')


def gettotal():
    '''
    Rule: Sum all net investment of investor minus sum all net investment of a startup
    Convention: if net is positive, that means the country donates money instead of receiving and vice versa
    Color: Blue means DONATING money, Red means RECEIVING MONEY
    '''
    df = get_net_investment()

    net_dict = {}

    for index, row in df.iterrows():
        if row['investor_country_code'] not in net_dict:
            net_dict[row['investor_country_code']] = 0
        net_dict[row['investor_country_code']] += row['substracted_net']
        if row['country_code'] not in net_dict:
            net_dict[row['country_code']] = 0
        net_dict[row['country_code']] -= row['substracted_net']

    return_d = {'country':list(net_dict.keys()) ,'net': list(net_dict.values())}
    return_df = pd.DataFrame(return_d)

    # Scale down the net column, otherwise the browser will go crazy
    # masking = (return_df['net'].values < 0).astype(np.int8)
    # np.place(masking, masking <= 0, -1)
    #
    # return_df['net'] = np.log2(np.absolute(return_df['net']) / 10)
    # return_df['net'] = return_df['net'].values * masking
    return_df['net'] /= 1e8

    return return_df.to_json(orient='records')