var pi_profile = '';

function postSunburst(profile)
{
 pi_profile = profile;
}

function post_to_url(url) {
    var form = document.createElement('form');
    form.action = url;
    form.method = 'POST';
    //form.target = '_blank';

    var profileHiddenField = document.createElement("input");
        profileHiddenField.setAttribute("type", "hidden");
        profileHiddenField.setAttribute("name", "profile");
        profileHiddenField.setAttribute("value", JSON.stringify(pi_profile));

    var imageHiddenField = document.createElement("input");
        imageHiddenField.setAttribute("type", "hidden");
        imageHiddenField.setAttribute("name", "image");
        imageHiddenField.setAttribute("value", globalState.selectedTwitterImage);

    form.appendChild(profileHiddenField);
    form.appendChild(imageHiddenField);
    document.body.appendChild(form);
    form.submit();
}

function postSunburstRequest()
{
 post_to_url("sunburst");
}
