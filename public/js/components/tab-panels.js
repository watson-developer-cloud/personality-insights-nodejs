/*
Tabbed Panels js
*/
(function() {
  $('.tab-panels--tab').click(function(e){
    e.cancelBubble = true;
    e.preventDefault();
    if (e.stopPropagation)
      e.stopPropagation();

    var self = $(this);
    var inputGroup = self.closest('.tab-panels');
    var idName = null;

    inputGroup.find('.active').removeClass('active');
    self.addClass('active');
    idName = self.attr('href');
    $(idName).addClass('active');
  });
})();
