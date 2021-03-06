import axios from 'axios'
import serverBaseUrl from '../config.dp'

const state = () => ({
    scrollLock: true,
    sourceArticle: {},
    matchArticleOnView: '',
    matchArticles: [],
    matchPool: [],
    preMatchedArticles: [],
    listPar: {
        title: true,
        author: true,
        tags: true,
        body: true
    },
    loadingMatches: false,
    findOverlapBool: true,
    indexNum: 1,
    progress: []
})

const getters = {
    sourceBodyAsArray: (state) => {
        return state.sourceArticle.body.split('\n')
    },
    parametersList: (state) => {
        return state.list
    },
    vocabulary: (state) => {
        return state.matchArticles[state.matchArticleOnView].data.vocabulary
    }
}

const actions = {
    async get_process ({ commit }) {
        await axios.get(`${serverBaseUrl.serverBaseUrl}/api/articles/progress`).then((res) => {
            commit('set_progressAr', res.data)
        })
    },
    async get_source ({ commit }) {
        await axios.get(`${serverBaseUrl.serverBaseUrl}/api/article/random`).then((res) => {
            commit('set_sourceAr', res.data)
        })
    },
    async get_source_open ({ commit }) {
        await axios.get(`${serverBaseUrl.serverBaseUrl}/api/articles/online-open`).then((res) => {
            const randomNumber = Math.ceil(Math.random() * res.data.length);
            commit('set_sourceAr', res.data[randomNumber])
        })
    },
    async get_source_openset ({ commit }) {
        await axios.get(`${serverBaseUrl.serverBaseUrl}/api/articles/open-set-reader`).then((res) => {
            const randomNumber = Math.ceil(Math.random() * res.data.length);
            commit('set_sourceAr', res.data[randomNumber]);
        })
    },
    async get_source_amateurcities ({ commit }) {
        await axios.get(`${serverBaseUrl.serverBaseUrl}/api/articles/amateur-cities`).then((res) => {
            const randomNumber = Math.ceil(Math.random() * res.data.length);
            commit('set_sourceAr', res.data[randomNumber])
        })
    },
    async get_match ({ commit, state }) {
        await axios.post(`${serverBaseUrl.serverBaseUrl}/api/ask`, {
            article_slug: state.sourceArticle.slug,
            article_publisher: state.sourceArticle.publisher,
            tokens: {
                title: state.listPar.title,
                author: state.listPar.author,
                tags: state.listPar.tags,
                body: state.listPar.body
            },
            size: 100
        }).then((res) => {
            commit('set_matchAr', res.data)
        })
    },
    async confirm_match ({ commit, state }) {
        await axios.post(`${serverBaseUrl.serverBaseUrl}/api/send`, {
            input_slug: state.sourceArticle.slug,
            input_publisher: state.sourceArticle.publisher,
            match_slug: state.matchArticles[state.matchArticleOnView].data.slug,
            match_publisher: state.matchArticles[state.matchArticleOnView].data.publisher,
            score: parseInt(state.matchArticles[state.matchArticleOnView].data.score),
            timestamp: new Date().toISOString()
        }).then((res) => {
            commit('set_ConfirmMatch', res.data)
            commit('setOnview', state.matchArticleOnView);
            commit('check_MatchValue');
        })
    },
    deny_match({ commit, state }) {
        commit('set_denyMatch');
        commit('setOnview', state.matchArticleOnView);
        commit('check_MatchValue');
    },
    nullMatches({ commit, state }) {
        commit('set_nullMatches');
    }
}

const mutations = {
    set_nullMatches(state) {
        state.matchArticleOnView = '';
        state.matchPool = [];
        state.matchArticles = [];
        state.indexNum = 1;
    },
    set_loadMatch(state) {
        state.loadingMatches = true;
    },
    unSet_loadMatch(state) {
        state.loadingMatches = false;
    },
    check_MatchValue(state) {
        state.matchArticles.forEach(function(elem, i){
            if(state.matchArticles[i].isMatch === '') {
                return;
            } else if (i === state.matchArticles.length - 1) {
                let newMatches = state.matchPool.splice(0, 3);
                newMatches[0].onView = true;

                newMatches.forEach(function(elem, i){
                    state.matchArticles.push(newMatches[i]);
                });
            }
        })
    },
    set_ConfirmMatch (state, data) {
        state.matchArticles[state.matchArticleOnView].isMatch = true;
        state.matchArticles[state.matchArticleOnView].onView = false;

        let confirmedMatch = state.matchArticles.splice(state.matchArticleOnView, 1);
        let trimmedConfirmedMatch = {
            match_publisher : confirmedMatch[0].data.publisher,
            match_slug : confirmedMatch[0].data.slug
        };

        state.preMatchedArticles.push(trimmedConfirmedMatch);
        if(state.matchArticleOnView > 0) {
            state.matchArticleOnView -= 1;
        } else {
            state.matchArticleOnView = 0;
        }

        if(state.matchArticles.length <= 0) {
            state.findOverlapBool = true;
            let newMatches = state.matchPool.splice(0, 3);
            newMatches[0].onView = true;

            newMatches.forEach(function(elem, i){
                state.matchArticles.push(newMatches[i]);
            });
        }
    },
    set_sourceAr (state, data) {
        state.sourceArticle = data;
        state.preMatchedArticles = data.matches;

        if(data.author.length <= 0) {
            state.listPar.author = false;
        }
        if(data.tags.length <= 0) {
            state.listPar.tags = false;
        }
    },
    changeLockedScroll (state) {
        state.scrollLock = !state.scrollLock
    },
    set_matchAr (state, data) {
        state.matchArticleOnView = 0;

        data.forEach(function(elem, i){
            elem.body = elem.body.split('\n');
            elem.score[0] = 0;

            if(i < 3) {
                let obj;
                if(i === 0) {
                    obj = {
                        onView : true,
                        isMatch : '',
                        matchIndex: state.indexNum,
                        data : data[i]
                    };
                } else {
                    obj = {
                        onView : false,
                        isMatch : '',
                        matchIndex: state.indexNum,
                        data : data[i]
                    };
                }
                state.matchArticles.push(obj);
                state.indexNum++;
            } else {
                let obj = {
                    onView : false,
                    isMatch : '',
                    matchIndex: state.indexNum,
                    data : data[i]
                };
                state.matchPool.push(obj);
                state.indexNum++;
            }
        });
    },
    set_denyMatch (state, data) {
        state.matchArticles[state.matchArticleOnView].isMatch = false;
        state.matchArticles.splice(state.matchArticleOnView, 1);
        if(state.matchArticleOnView > 0) {
            state.matchArticleOnView -= 1;
        } else {
            state.matchArticleOnView = 0;
        }

        if(state.matchArticles.length <= 0) {
            state.findOverlapBool = true;
            let newMatches = state.matchPool.splice(0, 3);
            newMatches[0].onView = true;

            newMatches.forEach(function(elem, i){
                state.matchArticles.push(newMatches[i]);
            });
        }
    },
    set_progressAr(state, data) {
        state.progress = data.publishers;
    },
    toggleThis(state, param) {
        state.listPar[param] = !state.listPar[param]
    },
    scoreThis(state, score) {
        state.matchArticles[state.matchArticleOnView].data.score[0] = score;
    },
    overLapFalse(state) {
        state.findOverlapBool = false;
    },
    overLapTrue(state) {
        state.findOverlapBool = true;
    },
    setOnview (state, n) {
        state.matchArticleOnView = n;
        state.matchArticles.forEach(function(elem, index){
            if(index === n) {
                state.matchArticles[index].onView = true;
            } else {
                state.matchArticles[index].onView = false;
            }
        });
    }
}

export default {
    state,
    getters,
    actions,
    mutations
}