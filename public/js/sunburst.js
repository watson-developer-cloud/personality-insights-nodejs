var pi_profile = '';

function postSunburst(profile)
{
 pi_profile = profile;
}

function post_to_url(url) {
    var form = document.createElement('form');
    form.action = url;
    form.method = 'POST';
    form.target = '_blank';

        var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", "data");
            hiddenField.setAttribute("value", JSON.stringify(pi_profile));
form.appendChild(hiddenField);
    document.body.appendChild(form);
    form.submit();
}

function postSunburstRequest()
{
 post_to_url("sunburst");
}
