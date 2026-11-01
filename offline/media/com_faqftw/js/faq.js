jQuery(document).ready(function() {
			jQuery('#ask_question').click(function () {								
					jQuery('.new_faq_form').slideToggle();
					jQuery('.ask').addClass('active');		
					jQuery('#close').hide();								
				});	
				
				jQuery('#ask-cancel').click(function () {	
					jQuery('.new_faq_form').slideToggle();
					jQuery('#ask').removeClass('active');									
				});

		jQuery('.categories_faqs').hide();
		jQuery('.faq_answer_standart').hide();
        jQuery('.faq_answer_default').hide();
        jQuery('.faq_answer_simple').hide();
		jQuery('#new_question_form').hide();
		
		jQuery('dt').bind("click", OpenDt);
		jQuery('dt').bind("mouseenter mouseleave", function(event){
				jQuery(this).toggleClass('hover');
		});
});

function OpenDt(){
			if(jQuery('.faq_default').is('.rtl') || jQuery('.faq_simple').is('.rtl') || jQuery('.faq_standart').is('.rtl')){
				var dir   = "rtl";
			}else{
				var dir   = "ltr";		  
			}
			jQuery(this).next('dd').slideToggle('normal');
			jQuery(this).siblings('span').eq(0).fadeToggle(200);
			jQuery(this).find('.category_title_'+dir).toggleClass('show_category_'+dir);
			jQuery(this).find('.faq_question_simple_'+dir).toggleClass('show_simple_'+dir);	
			jQuery(this).find('.standart_title_'+dir).toggleClass('show_standart_'+dir);	
			jQuery(this).find('.letter_a_' + dir).fadeToggle(500);
			jQuery(this).find('.letter_a_' + dir).toggleClass('show');
			if(jQuery(this).find('.letter_a_' + dir).is('.show')){
				jQuery(this).find('.letter_q_' + dir).animate({left: '-=15px',right: '-=15px'});
			}else{
				jQuery(this).find('.letter_q_' + dir).animate({left: '+=15px',right: '+=15px'});
			}
}

function openDd(){
	if(jQuery('.faq_default').is('.rtl') || jQuery('.faq_simple').is('.rtl') || jQuery('.faq_standart').is('.rtl')){
				var dir   = "rtl";
			}else{
				var dir   = "ltr";		  
			}
			jQuery(this).next().slideDown('normal');
			jQuery(this).find('.category_title_'+dir).toggleClass('show_category_'+dir);
			jQuery(this).find('.faq_question_simple_'+dir).toggleClass('show_simple_'+dir);	
			jQuery(this).find('.standart_title_'+dir).toggleClass('show_standart_'+dir);	
			jQuery(this).find('.letter_a_' + dir).fadeToggle(500);
			jQuery(this).next().next().fadeToggle(200);
			jQuery(this).find('.letter_a_' + dir).toggleClass('show');
			if(jQuery(this).find('.letter_a_' + dir).is('.show')){
				jQuery(this).find('.letter_q_' + dir).animate({left: '-=15px',right: '-=15px'});
			}else{
				jQuery(this).find('.letter_q_' + dir).animate({left: '+=15px',right: '+=15px'});
			}
}

function openAll(){ 
          jQuery('dt').click();
}
function openCats(){ 
		jQuery('.category').children('dt').click();
}
