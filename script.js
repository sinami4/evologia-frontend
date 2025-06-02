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

    let allSavedArticlesData = []; 

    // --- ПРОВЕРКА ЭЛЕМЕНТОВ ---
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
        console.log(`Переключение вида на: ${viewName}`);
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
            } else if (viewName === 'fullArticle') { // Поиск не нужен при просмотре полной статьи
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

    // --- ФУНКЦИЯ ЗАГРУЗКИ И ОТОБРАЖЕНИЯ ПОЛНОЙ СТАТЬИ ---
    async function displayFullArticle(articleId) {
        if (!newArticleOutput || !loadingIndicator) return;
        showView('generating'); // Показываем область вывода, индикатор появится ниже
        loadingIndicator.textContent = 'Загрузка полной статьи...';
        loadingIndicator.style.display = 'block';
        newArticleOutput.innerHTML = ''; // Очищаем перед загрузкой
        try {
            const response = await fetch(`${backendUrl}/api/articles/${articleId}`);
            if (!response.ok) { 
                let errorText = `Ошибка загрузки статьи ${articleId}: ${response.status}`;
                try { const errorData = await response.json(); errorText = errorData.error ? `${errorData.error} (Статус: ${response.status})` : errorText; } catch (e) {}
                throw new Error(errorText);
            }
            const fullArticleData = await response.json();
            let articleHtml = `<h2>${fullArticleData.title}</h2>` + fullArticleData.content_html;
            newArticleOutput.innerHTML = articleHtml; 
            const backButton = document.createElement('button');
            backButton.id = 'evoBackToListButton'; 
            backButton.textContent = '‹ Назад к списку статей';
            backButton.style.display = 'block'; 
            backButton.style.margin = '20px auto'; 
            backButton.style.padding = '10px 20px';
            backButton.style.fontSize = '16px';
            backButton.style.cursor = 'pointer';
            backButton.addEventListener('click', function() { newArticleOutput.innerHTML = ''; showView('list'); });
            const hrSeparator = document.createElement('hr'); 
            hrSeparator.style.marginTop = '30px';
            newArticleOutput.appendChild(hrSeparator);
            newArticleOutput.appendChild(backButton);
            showView('fullArticle'); // Теперь это вид полной статьи
        } catch (error) { 
            console.error('EvoLogia: Ошибка при загрузке полной статьи:', error);
            newArticleOutput.innerHTML = `<p style="color:red; text-align:center;">Не удалось загрузить статью: ${error.message}</p>`;
            const backButtonOnError = document.createElement('button');
            backButtonOnError.textContent = '‹ Назад к списку';
            backButtonOnError.style.marginTop = '10px'; 
            backButtonOnError.addEventListener('click', () => { newArticleOutput.innerHTML = ''; showView('list'); });
            newArticleOutput.appendChild(backButtonOnError);
            showView('fullArticle');
        } 
        finally { 
            loadingIndicator.style.display = 'none'; 
            loadingIndicator.textContent = 'Идет генерация статьи, пожалуйста, подождите...'; // Возвращаем стандартный текст
        }
    }
    
    // --- ФУНКЦИЯ ЗАГРУЗКИ И ОТОБРАЖЕНИЯ СПИСКА СОХРАНЕННЫХ СТАТЕЙ ---
    async function fetchAndDisplaySavedArticles() {
        if (!articleListContainer) return; 
        if (loadingIndicator && articleListContainer.innerHTML === '') { 
             articleListContainer.innerHTML = '<p>Загрузка сохраненных статей...</p>';
        }
        if (noSavedArticlesMessage) noSavedArticlesMessage.style.display = 'none';
        try {
            const response = await fetch(`${backendUrl}/api/articles`);
            if (!response.ok) throw new Error(`Ошибка сервера при загрузке списка статей: ${response.status}`);
            const responseData = await response.json(); 
            allSavedArticlesData = responseData.articles || []; 
            articleListContainer.innerHTML = ''; 
            if (allSavedArticlesData.length > 0) {
                allSavedArticlesData.forEach(article => {
                    articleListContainer.appendChild(renderSavedArticleItem(article));
                });
            }
        } catch (error) { 
            console.error('EvoLogia: Ошибка при загрузке списка сохраненных статей:', error);
            if (articleListContainer) articleListContainer.innerHTML = `<p style="color: red;">Не удалось загрузить список статей: ${error.message}</p>`;
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

        // console.log(`--- FilterAndManageUI --- Текст фильтра: "${filterText}"`); // Раскомментируй для отладки

        const displayedArticleItems = articleListContainer.querySelectorAll('.article-list-item');
        // console.log(`  Найдено .article-list-item для фильтрации: ${displayedArticleItems.length}`);

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

        // console.log(`  Всего видимых статей после применения фильтра: ${visibleArticlesCount}`);

        if (noSavedArticlesMessage) {
            if (allSavedArticlesData && allSavedArticlesData.length === 0 && filterText === '') {
                noSavedArticlesMessage.textContent = "Сохраненных статей пока нет. Попробуйте сгенерировать новую!";
                noSavedArticlesMessage.style.display = 'block';
            } else {
                noSavedArticlesMessage.style.display = 'none'; 
            }
        }

        if (generatorControls && generateNewButton && noSearchResultsMessage) {
            if (savedArticlesSection && savedArticlesSection.style.display === 'block') { // Показываем только если мы в режиме списка
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
        // console.log("--- FilterAndManageUI завершена ---");
    }

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
                 showView('list'); // Если ошибка генерации, возвращаемся к списку
            } 
            finally {
                if(loadingIndicator) loadingIndicator.style.display = 'none';
                // Кнопка "Сгенерировать" будет управляться filterAndManageUI, которую вызовет showView('list') или следующая операция
                // generateNewButton.disabled = false; 
                filterAndManageUI(); // Обновляем состояние UI после попытки генерации
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