document.addEventListener('DOMContentLoaded', function() {
    // --- ОСНОВНЫЕ ЭЛЕМЕНТЫ DOM ---
    const searchInput = document.getElementById('queryInput'); 
    const searchSection = document.getElementById('search-section'); 
    const savedArticlesSection = document.getElementById('saved-articles-section'); 
    const articleListContainer = document.getElementById('articleListContainer');
    const noSavedArticlesMessage = document.getElementById('noSavedArticlesMessage');
    
    const generatorControls = document.getElementById('generatorControls');
    const noSearchResultsMessage = document.getElementById('noSearchResultsMessage'); 
    const generateNewButton = document.getElementById('evoGenerateNewArticleButton'); 
    
    const loadingIndicator = document.getElementById('evoLoadingIndicator'); 
    const newArticleOutput = document.getElementById('evoNewArticleOutput'); 

    // --- URL БЭКЕНДА ---
    const backendUrl = 'https://evologia-backend.onrender.com'; 

    let allSavedArticlesData = []; // Для хранения данных всех загруженных с бэкенда статей

    // --- ПРОВЕРКА ЭЛЕМЕНТОВ (для отладки) ---
    if (!searchInput) console.error('EvoLogia: Поле поиска "queryInput" не найдено.');
    if (!searchSection) console.warn('EvoLogia: Секция "search-section" не найдена.');
    if (!savedArticlesSection) console.warn('EvoLogia: Секция "saved-articles-section" не найдена.');
    if (!articleListContainer) console.error('EvoLogia: Контейнер "articleListContainer" не найден.');
    if (!noSavedArticlesMessage) console.warn('EvoLogia: Сообщение "noSavedArticlesMessage" не найдено.');
    if (!generatorControls) console.error('EvoLogia: Контейнер "generatorControls" не найден.');
    if (!noSearchResultsMessage) console.warn('EvoLogia: Сообщение "noSearchResultsMessage" не найдено.');
    if (!generateNewButton) console.error('EvoLogia: Кнопка "evoGenerateNewArticleButton" не найдена.');
    if (!loadingIndicator) console.error('EvoLogia: Индикатор "evoLoadingIndicator" не найден.');
    if (!newArticleOutput) console.error('EvoLogia: Область "evoNewArticleOutput" не найдена.');

    // --- ФУНКЦИЯ УПРАВЛЕНИЯ ВИДИМОСТЬЮ ОСНОВНЫХ СЕКЦИЙ ---
    function showView(viewName) { 
        console.log(`EvoLogia: Переключение вида на: ${viewName}`);
        if (searchSection) searchSection.style.display = 'none';
        if (savedArticlesSection) savedArticlesSection.style.display = 'none';
        if (generatorControls) generatorControls.style.display = 'none';
        if (newArticleOutput) newArticleOutput.style.display = 'none';

        if (viewName === 'list') {
            if (searchSection) searchSection.style.display = 'block';
            if (savedArticlesSection) savedArticlesSection.style.display = 'block';
            filterAndManageUI(); 
        } else if (viewName === 'fullArticle' || viewName === 'generating') {
            if (searchSection && viewName === 'generating' && searchInput && searchInput.value) {
                 searchSection.style.display = 'block';
            } else if (viewName === 'fullArticle') { 
                 if(searchSection) searchSection.style.display = 'none';
            }
            if (newArticleOutput) newArticleOutput.style.display = 'block'; 
        }
    }

    // --- ФУНКЦИЯ ОТОБРАЖЕНИЯ ОДНОЙ "СВЕРНУТОЙ" СТАТЬИ В СПИСКЕ ---
    function renderSavedArticleItem(articleData) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('article-list-item'); 
        itemDiv.dataset.id = articleData.id; 
        const titleH3 = document.createElement('h3');
        titleH3.classList.add('article-list-title'); 
        titleH3.textContent = articleData.title;
        itemDiv.appendChild(titleH3);
        itemDiv.addEventListener('click', function() {
            displayFullArticle(articleData.id); 
        });
        return itemDiv;
    }

    // --- ФУНКЦИЯ ОТОБРАЖЕНИЯ ОДНОГО КОММЕНТАРИЯ ---
    function renderCommentItem(commentData) {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment-item');
        const authorP = document.createElement('p');
        authorP.classList.add('comment-author');
        authorP.innerHTML = `<strong>${commentData.author_name || 'Аноним'}</strong> <span class="comment-date">(${new Date(commentData.created_at).toLocaleString()})</span>:`;
        const textP = document.createElement('p');
        textP.classList.add('comment-text');
        textP.textContent = commentData.text;
        commentDiv.appendChild(authorP);
        commentDiv.appendChild(textP);
        return commentDiv;
    }

    // --- ФУНКЦИЯ ЗАГРУЗКИ И ОТОБРАЖЕНИЯ ПОЛНОЙ СТАТЬИ И КОММЕНТАРИЕВ ---
    async function displayFullArticle(articleId) {
        if (!newArticleOutput || !loadingIndicator) {
            console.error("EvoLogia: Отсутствуют элементы для отображения полной статьи.");
            return;
        }
        showView('generating'); 
        loadingIndicator.textContent = 'Загрузка статьи и комментариев...';
        loadingIndicator.style.display = 'block';
        newArticleOutput.innerHTML = ''; 
        try {
            console.log(`EvoLogia: Запрос полной статьи ID: ${articleId}`);
            const articleResponse = await fetch(`${backendUrl}/api/articles/${articleId}`);
            if (!articleResponse.ok) {
                let errorText = `Ошибка загрузки статьи ${articleId}: ${articleResponse.status}`;
                try { const errorData = await articleResponse.json(); errorText = errorData.error ? `${errorData.error} (Статус: ${articleResponse.status})` : errorText; } catch (e) {}
                throw new Error(errorText);
            }
            const fullArticleData = await articleResponse.json();
            console.log('EvoLogia: Полная статья получена:', fullArticleData);
            let articleHtml = `<h2>${fullArticleData.title}</h2>` + fullArticleData.content_html;
            newArticleOutput.innerHTML = articleHtml; 
            const commentsSectionDiv = document.createElement('div');
            commentsSectionDiv.id = 'comments-section';
            commentsSectionDiv.innerHTML = '<h3>Комментарии:</h3>'; 
            const commentsListDiv = document.createElement('div');
            commentsListDiv.id = 'comments-list';
            commentsSectionDiv.appendChild(commentsListDiv);
            const hrBeforeComments = document.createElement('hr');
            hrBeforeComments.style.marginTop = '25px';
            hrBeforeComments.style.marginBottom = '20px';
            newArticleOutput.appendChild(hrBeforeComments); 
            newArticleOutput.appendChild(commentsSectionDiv);
            console.log(`EvoLogia: Запрос комментариев для статьи ID: ${articleId}`);
            try {
                const commentsResponse = await fetch(`${backendUrl}/api/articles/${articleId}/comments`);
                if (!commentsResponse.ok) {
                    console.warn(`EvoLogia: Не удалось загрузить комментарии: ${commentsResponse.status}`);
                    commentsListDiv.innerHTML = '<p style="color: #777; font-style: italic;">Не удалось загрузить комментарии.</p>';
                } else {
                    const commentsData = await commentsResponse.json();
                    console.log('EvoLogia: Комментарии получены:', commentsData);
                    if (commentsData && Array.isArray(commentsData) && commentsData.length > 0) {
                        commentsData.forEach(comment => {
                            commentsListDiv.appendChild(renderCommentItem(comment));
                        });
                    } else {
                        commentsListDiv.innerHTML = '<p class="no-comments-yet" style="color: #777; font-style: italic;">Комментариев пока нет. Будьте первым!</p>';
                    }
                }
            } catch (commentsError) {
                console.error('EvoLogia: Ошибка при загрузке комментариев:', commentsError);
                commentsListDiv.innerHTML = `<p style="color: red;">Ошибка загрузки комментариев: ${commentsError.message}</p>`;
            }
            const addCommentForm = document.createElement('form');
            addCommentForm.id = 'add-comment-form';
            addCommentForm.innerHTML = `<h4>Оставить комментарий:</h4><div><label for="commentAuthorName">Ваше имя (необязательно):</label><input type="text" id="commentAuthorName" name="author_name" maxlength="100"></div><div><label for="commentText">Комментарий:</label><textarea id="commentText" name="text" rows="4" required></textarea></div><button type="submit" id="submitCommentButton">Отправить комментарий</button>`;
            commentsSectionDiv.appendChild(addCommentForm); 
            addCommentForm.addEventListener('submit', async function(event) {
                event.preventDefault(); 
                const authorNameInput = document.getElementById('commentAuthorName');
                const commentTextInput = document.getElementById('commentText');
                const author = authorNameInput.value.trim();
                const text = commentTextInput.value.trim();
                if (!text) { alert('Пожалуйста, введите текст комментария.'); return; }
                const submitButton = document.getElementById('submitCommentButton');
                if(submitButton) submitButton.disabled = true;
                try {
                    const response = await fetch(`${backendUrl}/api/articles/${articleId}/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ author_name: author, text: text })
                    });
                    if (!response.ok) { let errorText = `Ошибка отправки комментария: ${response.status}`; try { const errorData = await response.json(); errorText = errorData.error || errorText; } catch (e) {} throw new Error(errorText); }
                    const newCommentData = await response.json();
                    console.log('EvoLogia: Комментарий добавлен:', newCommentData.comment);
                    const noCommentsYetP = commentsListDiv.querySelector('p.no-comments-yet');
                    if(noCommentsYetP) noCommentsYetP.remove();
                    commentsListDiv.appendChild(renderCommentItem(newCommentData.comment));
                    authorNameInput.value = '';
                    commentTextInput.value = '';
                } catch (error) { console.error('EvoLogia: Ошибка при отправке комментария:', error); alert(`Не удалось отправить комментарий: ${error.message}`);} 
                finally { if(submitButton) submitButton.disabled = false; }
            });
            const backButton = document.createElement('button');
            backButton.id = 'evoBackToListButton'; backButton.textContent = '‹ Назад к списку статей';
            backButton.style.display = 'block'; backButton.style.margin = '30px auto 10px auto'; backButton.style.padding = '10px 20px';
            backButton.style.fontSize = '16px'; backButton.style.cursor = 'pointer';
            backButton.addEventListener('click', function() { newArticleOutput.innerHTML = ''; showView('list'); });
            const hrAfterComments = document.createElement('hr'); hrAfterComments.style.marginTop = '20px';
            newArticleOutput.appendChild(hrAfterComments); newArticleOutput.appendChild(backButton); 
            showView('fullArticle'); 
        } catch (error) { 
            console.error('EvoLogia: Ошибка при загрузке полной статьи:', error);
            newArticleOutput.innerHTML = `<p style="color:red; text-align:center;">Не удалось загрузить статью: ${error.message}</p>`;
            const backButtonOnError = document.createElement('button');
            backButtonOnError.textContent = '‹ Назад к списку'; backButtonOnError.style.marginTop = '10px'; 
            backButtonOnError.addEventListener('click', () => { newArticleOutput.innerHTML = ''; showView('list'); });
            newArticleOutput.appendChild(backButtonOnError);
            showView('fullArticle');
        } 
        finally { 
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none'; 
                loadingIndicator.textContent = 'Идет генерация статьи, пожалуйста, подождите...';
            }
        }
    }
    
    // --- ФУНКЦИЯ ЗАГРУЗКИ И ОТОБРАЖЕНИЯ СПИСКА СОХРАНЕННЫХ СТАТЕЙ ---
    async function fetchAndDisplaySavedArticles() {
        if (!articleListContainer) {
            console.error("EvoLogia: articleListContainer не найден, не могу отобразить статьи.");
            return; 
        }
        if (noSavedArticlesMessage) noSavedArticlesMessage.style.display = 'none';
        articleListContainer.innerHTML = '<p style="text-align:center; color:#777;">Загрузка сохраненных статей...</p>'; 
        try {
            console.log("EvoLogia: Запрос списка статей с бэкенда...");
            const response = await fetch(`${backendUrl}/api/articles`);
            if (!response.ok) {
                let errorDetail = `Статус: ${response.status}`;
                try { const errorData = await response.json(); errorDetail = errorData.error || JSON.stringify(errorData); } 
                catch (e) { try { errorDetail = await response.text(); } catch (e2) {} }
                throw new Error(`Ошибка сервера при загрузке списка статей (${errorDetail})`);
            }
            const responseData = await response.json(); 
            console.log("EvoLogia: Получены данные со списком статей:", responseData);

            if (responseData && Array.isArray(responseData.articles)) {
                allSavedArticlesData = responseData.articles; 
            } else {
                console.error("EvoLogia: Ответ API не содержит ожидаемого массива 'articles'. Получено:", responseData);
                allSavedArticlesData = []; 
            }

            articleListContainer.innerHTML = ''; 
            if (allSavedArticlesData.length > 0) {
                allSavedArticlesData.forEach(article => {
                    articleListContainer.appendChild(renderSavedArticleItem(article));
                });
            }
            // Сообщение "нет статей" будет управляться из filterAndManageUI
        } catch (error) { 
            console.error('EvoLogia: Ошибка при загрузке списка сохраненных статей:', error);
            if (articleListContainer) articleListContainer.innerHTML = `<p style="color: red; text-align:center;">Не удалось загрузить список статей: ${error.message}</p>`;
            allSavedArticlesData = []; 
        } 
        finally {
            showView('list'); 
        }
    }

    // --- ФУНКЦИЯ ФИЛЬТРАЦИИ СОХРАНЕННЫХ СТАТЕЙ И УПРАВЛЕНИЯ UI (ВАРИАНТ 7) ---
    function filterAndManageUI() {
        if (!searchInput || !articleListContainer) {
            console.warn("EvoLogia: Отсутствует поле поиска или контейнер списка статей.");
            if (generatorControls) generatorControls.style.display = 'none';
            return;
        }
        const filterText = searchInput.value.toLowerCase().trim();
        let visibleArticlesCount = 0;
        if (newArticleOutput && newArticleOutput.style.display !== 'block' && !newArticleOutput.querySelector('#evoPublishGeneratedArticleButton')) {
            newArticleOutput.innerHTML = '';
        }
        console.log(`--- FilterAndManageUI --- Текст фильтра: "${filterText}"`);
        const displayedArticleItems = articleListContainer.querySelectorAll('.article-list-item');
        console.log(`  Найдено .article-list-item для фильтрации: ${displayedArticleItems.length}`);
        displayedArticleItems.forEach(function(itemElement) {
            const titleElement = itemElement.querySelector('.article-list-title');
            const titleText = titleElement ? titleElement.textContent.toLowerCase() : '';
            let shouldBeVisible = (filterText === '' || titleText.includes(filterText));
            if (shouldBeVisible) {
                itemElement.style.setProperty('display', ''); 
                visibleArticlesCount++;
            } else {
                itemElement.style.setProperty('display', 'none', 'important'); 
            }
        });
        console.log(`  Всего видимых статей после применения фильтра: ${visibleArticlesCount}`);
        if (noSavedArticlesMessage) {
            if (allSavedArticlesData && allSavedArticlesData.length === 0 && filterText === '') {
                noSavedArticlesMessage.textContent = "Сохраненных статей пока нет. Попробуйте сгенерировать новую!";
                noSavedArticlesMessage.style.display = 'block';
            } else {
                noSavedArticlesMessage.style.display = 'none'; 
            }
        }
        if (generatorControls && generateNewButton && noSearchResultsMessage) {
            if (savedArticlesSection && savedArticlesSection.style.display === 'block') { 
                if (filterText !== '' && visibleArticlesCount === 0) {
                    generatorControls.style.display = 'block';
                    noSearchResultsMessage.style.display = 'block';
                    generateNewButton.style.display = 'block';
                    generateNewButton.disabled = false;
                } else {
                    generatorControls.style.display = 'none';
                }
            } else {
                 generatorControls.style.display = 'none';
            }
        }
        console.log("--- FilterAndManageUI завершена ---");
    }

    // --- СЛУШАТЕЛЬ ДЛЯ ПОИСКА ---
    if (searchInput) { 
        searchInput.addEventListener('input', function() {
            if (savedArticlesSection && savedArticlesSection.style.display === 'none' && newArticleOutput && newArticleOutput.style.display === 'block') {
                if (newArticleOutput.querySelector('#evoBackToListButton')) { 
                     newArticleOutput.innerHTML = ''; 
                }
            }
            showView('list'); 
        });
    }

    // --- ФУНКЦИЯ ДЛЯ КНОПКИ "ОПУБЛИКОВАТЬ" ---
    async function publishGeneratedArticle(title, contentHtml, searchQuery) {
        const publishButton = document.getElementById('evoPublishGeneratedArticleButton');
        if (loadingIndicator) {
            loadingIndicator.textContent = "Публикация статьи...";
            loadingIndicator.style.display = 'block';
        }
        if (generateNewButton) generateNewButton.disabled = true; 
        if (publishButton) publishButton.disabled = true;
        try {
            const response = await fetch(`${backendUrl}/api/articles`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title, content_html: contentHtml, search_query: searchQuery })
            });
            if (!response.ok) { 
                let errorText = `Ошибка публикации: ${response.status}`;
                try { const errorData = await response.json(); errorText = errorData.error || errorText; } catch (e) {}
                throw new Error(errorText);
            }
            const result = await response.json();
            alert('Статья успешно опубликована!');
            if(newArticleOutput) newArticleOutput.innerHTML = ''; 
            if (searchInput) searchInput.value = ''; 
            await fetchAndDisplaySavedArticles(); 
        } catch (error) {
            alert(`Не удалось опубликовать статью: ${error.message}`);
            if (generateNewButton) generateNewButton.disabled = false; 
            if(publishButton) publishButton.disabled = false; 
        } finally {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
                loadingIndicator.textContent = "Идет генерация статьи, пожалуйста, подождите...";
            }
        }
    }

    // --- ОБРАБОТЧИК ДЛЯ КНОПКИ "СГЕНЕРИРОВАТЬ НОВУЮ СТАТЬЮ" ---
    if (generateNewButton) {
        generateNewButton.addEventListener('click', async function() {
            if (!searchInput) return;
            const userQuery = searchInput.value.trim();
            if (!userQuery) { alert('Введите тему для генерации в поле поиска.'); return; }

            showView('generating'); 
            if(loadingIndicator) {
                loadingIndicator.textContent = "Идет генерация статьи, пожалуйста, подождите...";
                loadingIndicator.style.display = 'block';
            }
            if(newArticleOutput) newArticleOutput.innerHTML = ''; 
            generateNewButton.disabled = true;
            try {
                const response = await fetch(`${backendUrl}/generate-article`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: userQuery }) 
                });
                if (!response.ok) { 
                    let errorText = `Ошибка генерации: ${response.status}`;
                    try { const errorData = await response.json(); errorText = errorData.error || errorText; } catch (e) {}
                    throw new Error(errorText);
                }
                const data = await response.json();
                if (newArticleOutput) {
                    newArticleOutput.innerHTML = data.article; 
                    
                    const existingPublishButton = document.getElementById('evoPublishGeneratedArticleButton');
                    if (existingPublishButton) existingPublishButton.remove(); 
                    const existingHr = newArticleOutput.querySelector('hr.publish-separator');
                    if (existingHr) existingHr.remove();

                    const publishButton = document.createElement('button');
                    publishButton.id = 'evoPublishGeneratedArticleButton';
                    publishButton.textContent = 'Опубликовать эту статью';
                    publishButton.style.display = 'block';
                    publishButton.style.margin = '20px auto';
                    publishButton.style.padding = '12px 25px';
                    publishButton.style.backgroundColor = '#28a745'; 
                    publishButton.style.color = 'white';
                    publishButton.style.border = 'none';
                    publishButton.style.borderRadius = '5px';
                    publishButton.style.cursor = 'pointer';
                    publishButton.style.fontSize = '16px';
                    publishButton.style.fontFamily = 'inherit';

                    publishButton.addEventListener('click', function() {
                        let articleHtmlToPublish = newArticleOutput.innerHTML;
                        const buttonHtmlString = publishButton.outerHTML;
                        const hrElementForString = document.createElement('hr');
                        hrElementForString.className = 'publish-separator';
                        const hrToRemoveHtml = hrElementForString.outerHTML; 
                        
                        articleHtmlToPublish = articleHtmlToPublish.replace(buttonHtmlString, '');
                        const lastHrIndex = articleHtmlToPublish.lastIndexOf(hrToRemoveHtml);
                        if (lastHrIndex !== -1) {
                            articleHtmlToPublish = articleHtmlToPublish.substring(0, lastHrIndex) + articleHtmlToPublish.substring(lastHrIndex + hrToRemoveHtml.length);
                        }
                        
                        publishGeneratedArticle(userQuery, articleHtmlToPublish.trim(), userQuery);
                    });
                    const hrElement = document.createElement('hr');
                    hrElement.className = 'publish-separator'; 
                    newArticleOutput.appendChild(hrElement); 
                    newArticleOutput.appendChild(publishButton);
                }
            } catch (error) { 
                console.error('EvoLogia: Ошибка при генерации статьи:', error);
                if (newArticleOutput) {
                    newArticleOutput.innerHTML = `<p style="color: red;">Произошла ошибка при генерации: ${error.message}</p>`;
                }
                 showView('list'); 
            } 
            finally {
                if(loadingIndicator) loadingIndicator.style.display = 'none';
                filterAndManageUI(); 
            }
        });
    }

    // --- НАЧАЛЬНАЯ ЗАГРУЗКА ---
    if (articleListContainer) { 
      fetchAndDisplaySavedArticles(); 
    } else {
      showView('list'); 
      filterAndManageUI(); 
    }
});